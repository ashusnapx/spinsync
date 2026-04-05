import { NextRequest } from "next/server";
import { db } from "@/db";
import { machines, machineSessions, queueEntries } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireOrganization, requireRole, requireResourceAccess, withGuard } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";
import { getOrgUserDisplayMap } from "@/lib/org-user-display";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";
import {
  isValidLatitude,
  isValidLongitude,
  normalizeCoordinate,
} from "@/lib/machine-location";

// ═══════════════════════════════════════════
// GET /api/machines — List machines for active org
// ═══════════════════════════════════════════

export async function GET(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireOrganization(request);

    const machineList = await db
      .select()
      .from(machines)
      .where(eq(machines.orgId, ctx.orgId));

    // ── Auto-Heal: Cleanup 'occupied' machines with no active session records ──
    const activeSessions = await db
      .select({
        id: machineSessions.id,
        machineId: machineSessions.machineId,
        userId: machineSessions.userId,
        startedAt: machineSessions.startedAt,
      })
      .from(machineSessions)
      .where(
        and(
          eq(machineSessions.orgId, ctx.orgId),
          isNull(machineSessions.endedAt)
        )
      );

    const activeSessionByMachineId = new Map(
      activeSessions.map((session) => [session.machineId, session])
    );

    // If a machine says it's occupied but has no session in the session list, reset it to free
    const orphans = machineList.filter(
      (m) => m.status === "occupied" && !activeSessionByMachineId.has(m.id)
    );

    if (orphans.length > 0) {
      await db
        .update(machines)
        .set({ status: "free", currentSessionId: null, updatedAt: new Date() })
        .where(
          and(
            eq(machines.orgId, ctx.orgId),
            sql`${machines.id} IN (${sql.join(
              orphans.map((o) => o.id),
              sql`, `
            )})`
          )
        );
      
      // Refresh machine list after healing
      const healedMachines = await db
        .select()
        .from(machines)
        .where(eq(machines.orgId, ctx.orgId));
      
      machineList.length = 0;
      machineList.push(...healedMachines);
    }

    const userDisplayMap = await getOrgUserDisplayMap(
      ctx.orgId,
      activeSessions.map((session) => session.userId)
    );

    return success(
      machineList.map((machine) => ({
        ...machine,
        currentSession: (() => {
          const session = activeSessionByMachineId.get(machine.id);

          if (!session) {
            return null;
          }

          return {
            ...session,
            userName:
              userDisplayMap.get(session.userId)?.chatLabel ?? "Resident",
          };
        })(),
      }))
    );
  });
}

// ═══════════════════════════════════════════
// POST /api/machines — Create a machine (admin only)
// ═══════════════════════════════════════════

export async function POST(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireRole(request, "pg_admin", "owner");
    const body = await request.json();
    const { name, type, floor, latitude, longitude } = body;

    if (!name || !type) {
      return errors.validation("Missing required fields: name, type");
    }

    const validTypes = ["washing_machine", "dryer", "iron", "dishwasher"];
    if (!validTypes.includes(type)) {
      return errors.validation(`Invalid machine type. Must be one of: ${validTypes.join(", ")}`);
    }

    const parsedLatitude = normalizeCoordinate(latitude);
    const parsedLongitude = normalizeCoordinate(longitude);

    if (!isValidLatitude(parsedLatitude) || !isValidLongitude(parsedLongitude)) {
      return errors.validation(
        "Valid machine latitude and longitude are required"
      );
    }

    // Generate a QR secret for this machine
    const qrSecret = createHash("sha256")
      .update(uuidv4() + Date.now().toString())
      .digest("hex");

    const [machine] = await db
      .insert(machines)
      .values({
        name,
        type,
        status: "free",
        orgId: ctx.orgId,
        floor: floor || null,
        location: null,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        qrSecret,
      })
      .returning();

    await audit({
      userId: ctx.user.id,
      action: "machine.created",
      resource: "machine",
      resourceId: machine.id,
      metadata: { name, type, floor },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success(machine, 201);
  });
}

// ═══════════════════════════════════════════
// PATCH /api/machines — Update a machine (admin only)
// ═══════════════════════════════════════════

export async function PATCH(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireRole(request, "pg_admin", "owner");
    const body = await request.json();
    const { machineId, name, type, status, floor, latitude, longitude } = body;

    if (!machineId) {
      return errors.validation("machineId is required");
    }

    // Verify machine belongs to this org
    const [existing] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, machineId))
      .limit(1);

    if (!existing) {
      return errors.notFound("Machine");
    }

    requireResourceAccess(ctx, existing.orgId);

    // Admin-only status transitions
    const adminStatuses = ["maintenance", "out_of_order", "free"];
    if (status && !adminStatuses.includes(status)) {
      return errors.validation(`Admin can only set status to: ${adminStatuses.join(", ")}`);
    }

    // ── Transactional Update ──
    const updated = await db.transaction(async (tx) => {
      // 1. Get the latest machine state
      const [machine] = await tx
        .select()
        .from(machines)
        .where(eq(machines.id, machineId))
        .limit(1);

      if (!machine) return null;

      const isEnteringMaintenance =
        status &&
        ["maintenance", "out_of_order"].includes(status) &&
        machine.status !== status;

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
        ...(name && { name }),
        ...(type && { type }),
        ...(status && { status }),
        ...(floor !== undefined && { floor }),
      };

      if (latitude !== undefined || longitude !== undefined) {
        updateData.latitude = normalizeCoordinate(latitude);
        updateData.longitude = normalizeCoordinate(longitude);
      }

      // 2. If entering maintenance, clean up everything
      if (isEnteringMaintenance) {
        // End active session
        if (machine.currentSessionId) {
          await tx
            .update(machineSessions)
            .set({
              endedAt: new Date(),
              endReason: "admin_maintenance",
            })
            .where(eq(machineSessions.id, machine.currentSessionId));
        }

        // Clear queue
        await tx.delete(queueEntries).where(eq(queueEntries.machineId, machineId));

        // Ensure status is maintenance and session ID is cleared
        updateData.currentSessionId = null;
      }

      const [res] = await tx
        .update(machines)
        .set(updateData)
        .where(eq(machines.id, machineId))
        .returning();

      return res;
    });

    if (!updated) {
      return errors.notFound("Machine");
    }

    await audit({
      userId: ctx.user.id,
      action: "machine.updated",
      resource: "machine",
      resourceId: machineId,
      metadata: { previousStatus: existing.status, ...body },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success(updated);
  });
}
