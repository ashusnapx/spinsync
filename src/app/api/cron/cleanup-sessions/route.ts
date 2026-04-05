import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { machineSessions, machines } from "@/db/schema";
import { and, eq, isNull, lt, inArray } from "drizzle-orm";
import { audit } from "@/lib/logger";

// ═══════════════════════════════════════════
// CRON: Cleanup Zombie Sessions
// Target: Sessions with heartbeat older than 5 minutes
// ═══════════════════════════════════════════

export async function GET(request: NextRequest) {
  // 1. Verify cron secret (Vercel Cron security)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ZOMBIE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  const now = new Date();
  const cutoff = new Date(now.getTime() - ZOMBIE_TIMEOUT_MS);

  try {
    // 0. Cleanup Grace Period machines (Background utility)
    await db
      .update(machines)
      .set({
        status: "free",
        currentSessionId: null,
        updatedAt: now,
      })
      .where(eq(machines.status, "grace_period"));

    // 2. Find zombie sessions (Batch of 50 to avoid heavy load)
    const zombies = await db
      .select({
        id: machineSessions.id,
        machineId: machineSessions.machineId,
        userId: machineSessions.userId,
        orgId: machineSessions.orgId,
      })
      .from(machineSessions)
      .where(and(isNull(machineSessions.endedAt), lt(machineSessions.heartbeatAt, cutoff)))
      .limit(50);

    if (zombies.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const zombieIds = zombies.map((z) => z.id);
    const machineIds = zombies.map((z) => z.machineId);

    // 3. Atomic Batch Cleanup
    await db.transaction(async (tx) => {
      // End sessions
      await tx
        .update(machineSessions)
        .set({
          endedAt: now,
          wasAutoEnded: true,
          endReason: "zombie_timeout",
        })
        .where(inArray(machineSessions.id, zombieIds));

      // Free machines
      await tx
        .update(machines)
        .set({
          status: "free",
          currentSessionId: null,
          updatedAt: now,
        })
        .where(inArray(machines.id, machineIds));
    });

    // 4. Audit Log (Async)
    for (const zombie of zombies) {
      audit({
        userId: null, // System-initiated
        action: "machine.auto_ended",
        resource: "machine",
        resourceId: zombie.machineId,
        metadata: {
          sessionId: zombie.id,
          reason: "zombie_heartbeat_timeout",
          originalUserId: zombie.userId,
          orgId: zombie.orgId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      count: zombies.length,
      terminatedIds: zombieIds,
    });
  } catch (err) {
    console.error("[CRON] Cleanup failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
