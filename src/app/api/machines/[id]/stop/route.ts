import { NextRequest } from "next/server";
import { db } from "@/db";
import { machines, machineSessions, queueEntries, notifications } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireOrganization, requireResourceAccess, withGuard } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";

// ═══════════════════════════════════════════
// POST /api/machines/[id]/stop — Stop using a machine
// Transitions to GRACE_PERIOD and notifies next in queue
// ═══════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withGuard(async () => {
    const { id: machineId } = await params;
    const ctx = await requireOrganization(request);

    // ── Find the active session for this user on this machine ──
    const [machine] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, machineId))
      .limit(1);

    if (!machine) return errors.notFound("Machine");
    requireResourceAccess(ctx, machine.orgId);

    if (machine.status !== "occupied") {
      return errors.machineUnavailable("Machine is not currently in use");
    }

    // Get current session
    const [activeSession] = machine.currentSessionId
      ? await db
          .select()
          .from(machineSessions)
          .where(eq(machineSessions.id, machine.currentSessionId))
          .limit(1)
      : [null];

    // Only session owner or admin can stop
    if (
      activeSession &&
      activeSession.userId !== ctx.user.id &&
      ctx.orgRole !== "owner" &&
      ctx.orgRole !== "pg_admin"
    ) {
      return errors.forbidden("Only the session owner or admin can stop this machine");
    }

    // ── End the session ──
    const now = new Date();
    if (activeSession) {
      const durationMinutes = Math.round(
        (now.getTime() - new Date(activeSession.startedAt).getTime()) / 60000
      );

      await db
        .update(machineSessions)
        .set({
          endedAt: now,
          durationMinutes,
          graceStartedAt: now,
        })
        .where(eq(machineSessions.id, activeSession.id));
    }

    // ── Transition to GRACE_PERIOD ──
    await db
      .update(machines)
      .set({
        status: "grace_period",
        updatedAt: now,
      })
      .where(eq(machines.id, machineId));

    // ── Notify next person in queue ──
    const [nextInQueue] = await db
      .select()
      .from(queueEntries)
      .where(eq(queueEntries.machineId, machineId))
      .orderBy(asc(queueEntries.position))
      .limit(1);

    if (nextInQueue) {
      await db.insert(notifications).values({
        userId: nextInQueue.userId,
        type: "your_turn",
        title: "Your turn!",
        body: `${machine.name} is finishing up. You're next in line! It will be free in ~5 minutes.`,
        metadata: { machineId, machineName: machine.name },
      });

      // Mark as notified
      await db
        .update(queueEntries)
        .set({ notifiedAt: now })
        .where(eq(queueEntries.id, nextInQueue.id));
    }

    // ── Send clothes warning to the current user ──
    await db.insert(notifications).values({
      userId: ctx.user.id,
      type: "clothes_warning",
      title: "Collect your clothes!",
      body: `Please collect your clothes from ${machine.name} within 5 minutes to avoid the machine being locked.`,
      metadata: { machineId, machineName: machine.name },
    });

    await audit({
      userId: ctx.user.id,
      action: "machine.stopped",
      resource: "machine",
      resourceId: machineId,
      metadata: {
        sessionId: activeSession?.id,
        durationMinutes: activeSession
          ? Math.round(
              (now.getTime() - new Date(activeSession.startedAt).getTime()) / 60000
            )
          : null,
      },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({
      status: "grace_period",
      graceEndsAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      nextInQueue: nextInQueue
        ? { userId: nextInQueue.userId, position: nextInQueue.position }
        : null,
    });
  });
}
