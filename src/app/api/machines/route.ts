import { NextRequest } from "next/server";
import { db } from "@/db";
import { machines, machineSessions } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
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

    await db
      .update(machines)
      .set({
        status: "free",
        currentSessionId: null,
        updatedAt: new Date(),
      })
      .where(and(eq(machines.orgId, ctx.orgId), eq(machines.status, "grace_period")));

    const machineList = await db
      .select()
      .from(machines)
      .where(eq(machines.orgId, ctx.orgId));

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

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (status) updateData.status = status;
    if (floor !== undefined) updateData.floor = floor;

    const parsedLatitude = normalizeCoordinate(latitude);
    const parsedLongitude = normalizeCoordinate(longitude);

    if (latitude !== undefined || longitude !== undefined) {
      if (!isValidLatitude(parsedLatitude) || !isValidLongitude(parsedLongitude)) {
        return errors.validation(
          "Valid machine latitude and longitude are required"
        );
      }

      updateData.latitude = parsedLatitude;
      updateData.longitude = parsedLongitude;
    }

    const [updated] = await db
      .update(machines)
      .set(updateData)
      .where(eq(machines.id, machineId))
      .returning();

    if (status) {
      await audit({
        userId: ctx.user.id,
        action: status === "maintenance" ? "machine.maintenance" : "machine.created",
        resource: "machine",
        resourceId: machineId,
        metadata: { previousStatus: existing.status, newStatus: status },
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      });
    }

    return success(updated);
  });
}
