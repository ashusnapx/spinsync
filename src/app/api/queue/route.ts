import { NextRequest } from "next/server";
import { db } from "@/db";
import { queueEntries, machines } from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireOrganization, requireResourceAccess, withGuard } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";

// ═══════════════════════════════════════════
// GET /api/queue?machineId=xxx — Get queue for a machine
// ═══════════════════════════════════════════

export async function GET(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireOrganization(request);
    const machineId = request.nextUrl.searchParams.get("machineId");

    if (!machineId) {
      return errors.validation("machineId query parameter is required");
    }

    const queue = await db
      .select()
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.machineId, machineId),
          eq(queueEntries.orgId, ctx.orgId)
        )
      )
      .orderBy(asc(queueEntries.position));

    return success(queue);
  });
}

// ═══════════════════════════════════════════
// POST /api/queue — Join the queue for a machine
// Uses Smart Priority Formula with fairness decay
// ═══════════════════════════════════════════

export async function POST(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireOrganization(request);
    const body = await request.json();
    const { machineId } = body;

    if (!machineId) {
      return errors.validation("machineId is required");
    }

    // ── Verify machine exists and belongs to org ──
    const [machine] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, machineId))
      .limit(1);

    if (!machine) return errors.notFound("Machine");
    requireResourceAccess(ctx, machine.orgId);

    const existingEntries = await db
      .select()
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.orgId, ctx.orgId),
          eq(queueEntries.userId, ctx.user.id)
        )
      );

    if (existingEntries.some((entry) => entry.machineId === machineId)) {
      return errors.conflict("You are already in the queue for this machine");
    }

    const replacedMachineIds = Array.from(
      new Set(existingEntries.map((entry) => entry.machineId))
    );

    if (replacedMachineIds.length > 0) {
      await db
        .delete(queueEntries)
        .where(
          and(
            eq(queueEntries.orgId, ctx.orgId),
            eq(queueEntries.userId, ctx.user.id)
          )
        );

      await Promise.all(replacedMachineIds.map((queuedMachineId) => resortQueue(queuedMachineId)));
    }

    // ── Get current max position ──
    const [maxPos] = await db
      .select({ maxPosition: sql<number>`COALESCE(MAX(position), 0)` })
      .from(queueEntries)
      .where(eq(queueEntries.machineId, machineId));

    const position = (maxPos?.maxPosition || 0) + 1;

    // ── Insert into queue ──
    const [entry] = await db
      .insert(queueEntries)
      .values({
        machineId,
        userId: ctx.user.id,
        orgId: ctx.orgId,
        priorityScore: 0,
        premiumWeight: 0,
        fairnessDecay: 0,
        position,
      })
      .returning();

    // ── Re-sort queue to keep FIFO positions stable ──
    await resortQueue(machineId);

    await audit({
      userId: ctx.user.id,
      action: "queue.joined",
      resource: "machine",
      resourceId: machineId,
      metadata: { position, replacedMachineIds },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({
      ...entry,
      replacedMachineIds,
      estimatedWaitMinutes: position * 30,
    });
  });
}

// ═══════════════════════════════════════════
// DELETE /api/queue — Leave the queue
// ═══════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireOrganization(request);
    const machineId = request.nextUrl.searchParams.get("machineId");

    const existingEntries = await db
      .select()
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.orgId, ctx.orgId),
          eq(queueEntries.userId, ctx.user.id),
          ...(machineId ? [eq(queueEntries.machineId, machineId)] : [])
        )
      );

    if (existingEntries.length === 0) {
      return errors.notFound("Queue entry");
    }

    await db
      .delete(queueEntries)
      .where(
        and(
          eq(queueEntries.orgId, ctx.orgId),
          eq(queueEntries.userId, ctx.user.id),
          ...(machineId ? [eq(queueEntries.machineId, machineId)] : [])
        )
      );

    await Promise.all(
      Array.from(new Set(existingEntries.map((entry) => entry.machineId))).map((queuedMachineId) =>
        resortQueue(queuedMachineId)
      )
    );

    await audit({
      userId: ctx.user.id,
      action: "queue.left",
      resource: "machine",
      resourceId: machineId ?? existingEntries[0].machineId,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({
      removed: true,
      removedMachineIds: existingEntries.map((entry) => entry.machineId),
    });
  });
}

/**
 * Re-sort queue positions to preserve FIFO order.
 */
async function resortQueue(machineId: string) {
  await db.execute(sql`
    WITH ranked AS (
      SELECT id,
        ROW_NUMBER() OVER (
          ORDER BY 
            joined_at ASC
        ) as new_position
      FROM queue_entries
      WHERE machine_id = ${machineId}
    )
    UPDATE queue_entries 
    SET position = ranked.new_position
    FROM ranked
    WHERE queue_entries.id = ranked.id
  `);
}
