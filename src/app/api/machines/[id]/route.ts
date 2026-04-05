import { NextRequest } from "next/server";
import { db } from "@/db";
import { machines, machineSessions, queueEntries } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireRole, requireResourceAccess, withGuard } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";
import {
  normalizeCoordinate,
} from "@/lib/machine-location";

// ═══════════════════════════════════════════
// DELETE /api/machines/[id] — Delete a machine (admin only)
// ═══════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withGuard(async () => {
    const ctx = await requireRole(request, "pg_admin", "owner");
    const { id } = await params;

    if (!id) {
      return errors.validation("Machine ID is required");
    }

    // Verify machine exists and belongs to this org
    const [existing] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, id))
      .limit(1);

    if (!existing) {
      return errors.notFound("Machine");
    }

    requireResourceAccess(ctx, existing.orgId);

    // Delete the machine
    await db.delete(machines).where(eq(machines.id, id));

    // Audit log
    await audit({
      userId: ctx.user.id,
      action: "machine.deleted",
      resource: "machine",
      resourceId: id,
      metadata: { name: existing.name, type: existing.type },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({ deleted: true, id });
  });
}

// ═══════════════════════════════════════════
// PATCH /api/machines/[id] — Update a machine (admin only)
// ═══════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withGuard(async () => {
    const ctx = await requireRole(request, "pg_admin", "owner");
    const { id } = await params;
    const body = await request.json();
    const { name, type, status, floor, latitude, longitude } = body;

    if (!id) {
      return errors.validation("Machine ID is required");
    }

    // Verify machine belongs to this org
    const [existing] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, id))
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

    const parsedLatitude = normalizeCoordinate(latitude);
    const parsedLongitude = normalizeCoordinate(longitude);

    // ── Transactional Update ──
    const updated = await db.transaction(async (tx) => {
      // 1. Get the latest machine state within transaction
      const [machine] = await tx
        .select()
        .from(machines)
        .where(eq(machines.id, id))
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
        updateData.latitude = parsedLatitude;
        updateData.longitude = parsedLongitude;
      }

      // 2. If entering maintenance, clean up everything
      if (isEnteringMaintenance) {
        // End active session if exists
        if (machine.currentSessionId) {
          await tx
            .update(machineSessions)
            .set({
              endedAt: new Date(),
              endReason: "admin_maintenance",
            })
            .where(eq(machineSessions.id, machine.currentSessionId));
        } else {
          // Double check for orphaned active sessions
          await tx
            .update(machineSessions)
            .set({
              endedAt: new Date(),
              endReason: "admin_maintenance",
            })
            .where(
              and(
                eq(machineSessions.machineId, id),
                isNull(machineSessions.endedAt)
              )
            );
        }

        // Clear queue for this machine
        await tx.delete(queueEntries).where(eq(queueEntries.machineId, id));

        // Ensure status is maintenance and session ID is cleared
        updateData.currentSessionId = null;
      }

      const [res] = await tx
        .update(machines)
        .set(updateData)
        .where(eq(machines.id, id))
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
      resourceId: id,
      metadata: { previousStatus: existing.status, ...body },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success(updated);
  });
}
