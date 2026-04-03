import { NextRequest } from "next/server";
import { db } from "@/db";
import { queueEntries, userProfiles, machines } from "@/db/schema";
import { eq, and, asc, desc, sql, gte } from "drizzle-orm";
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

    // ── Check user not already in queue ──
    const [existing] = await db
      .select()
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.machineId, machineId),
          eq(queueEntries.userId, ctx.user.id)
        )
      )
      .limit(1);

    if (existing) {
      return errors.conflict("You are already in the queue for this machine");
    }

    // ── Get user profile for premium weight ──
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, ctx.user.id))
      .limit(1);

    const isPremium = profile?.subscriptionStatus === "premium";

    // ── Calculate fairness decay ──
    // Count how many times this user jumped queue in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentJumps = await db
      .select({ count: sql<number>`count(*)` })
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.userId, ctx.user.id),
          gte(queueEntries.joinedAt, twentyFourHoursAgo)
        )
      );

    const jumpCount = Number(recentJumps[0]?.count || 0);
    const premiumWeight = isPremium ? 30 : 0;
    const fairnessDecay = isPremium ? -(jumpCount * 5) : 0;

    // Wait time starts at 0, increases over time (calculated at query time)
    const priorityScore = premiumWeight + fairnessDecay;

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
        priorityScore,
        premiumWeight,
        fairnessDecay,
        position,
      })
      .returning();

    // ── Re-sort queue by priority (premium users move up, but with decay) ──
    await resortQueue(machineId);

    await audit({
      userId: ctx.user.id,
      action: "queue.joined",
      resource: "machine",
      resourceId: machineId,
      metadata: { position, priorityScore, premiumWeight, fairnessDecay },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({
      ...entry,
      estimatedWaitMinutes: position * 30, // rough estimate: 30 min per person
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

    if (!machineId) {
      return errors.validation("machineId query parameter is required");
    }

    const result = await db
      .delete(queueEntries)
      .where(
        and(
          eq(queueEntries.machineId, machineId),
          eq(queueEntries.userId, ctx.user.id)
        )
      );

    if ((result.rowCount ?? 0) === 0) {
      return errors.notFound("Queue entry");
    }

    // Re-sort remaining queue
    await resortQueue(machineId);

    await audit({
      userId: ctx.user.id,
      action: "queue.left",
      resource: "machine",
      resourceId: machineId,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({ removed: true });
  });
}

/**
 * Re-sort queue positions based on priority scores.
 * priority_score = premium_weight + wait_time_minutes + fairness_decay
 * Wait time is calculated dynamically from joinedAt.
 */
async function resortQueue(machineId: string) {
  // Recalculate with dynamic wait time and re-assign positions
  await db.execute(sql`
    WITH ranked AS (
      SELECT id,
        ROW_NUMBER() OVER (
          ORDER BY 
            (priority_score + EXTRACT(EPOCH FROM (NOW() - joined_at)) / 60) DESC,
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
