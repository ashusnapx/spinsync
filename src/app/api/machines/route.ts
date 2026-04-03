import { NextRequest } from "next/server";
import { db } from "@/db";
import { machines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireOrganization, requireRole, requireResourceAccess, withGuard } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";

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

    return success(machineList);
  });
}

// ═══════════════════════════════════════════
// POST /api/machines — Create a machine (admin only)
// ═══════════════════════════════════════════

export async function POST(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireRole(request, "pg_admin", "owner");
    const body = await request.json();
    const { name, type, floor, locationDescription } = body;

    if (!name || !type) {
      return errors.validation("Missing required fields: name, type");
    }

    const validTypes = ["washing_machine", "dryer", "iron", "dishwasher"];
    if (!validTypes.includes(type)) {
      return errors.validation(`Invalid machine type. Must be one of: ${validTypes.join(", ")}`);
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
        location: locationDescription || null,
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
    const { machineId, name, type, status, floor, locationDescription } = body;

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
    if (locationDescription !== undefined) updateData.location = locationDescription;

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
