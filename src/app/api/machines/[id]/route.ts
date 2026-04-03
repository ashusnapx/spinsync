import { NextRequest } from "next/server";
import { db } from "@/db";
import { machines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireRole, requireResourceAccess, withGuard } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";

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
    const { name, type, status, floor, locationDescription } = body;

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

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (status) updateData.status = status;
    if (floor !== undefined) updateData.floor = floor;
    if (locationDescription !== undefined) updateData.location = locationDescription;

    const [updated] = await db
      .update(machines)
      .set(updateData)
      .where(eq(machines.id, id))
      .returning();

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
