import { NextRequest } from "next/server";
import { db } from "@/db";
import { machines, machineSessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireOrganization, withGuard } from "@/lib/guard";

// ═══════════════════════════════════════════
// POST /api/machines/[id]/heartbeat — Session heartbeat
// Client sends every 2 minutes to indicate active session
// ═══════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withGuard(async () => {
    const { id: machineId } = await params;
    const ctx = await requireOrganization(request);

    // ── Find the machine ──
    const [machine] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, machineId))
      .limit(1);

    if (!machine) return errors.notFound("Machine");
    if (machine.status !== "occupied") {
      return errors.machineUnavailable("Machine is not currently in active session");
    }

    if (!machine.currentSessionId) {
      return errors.internal("Machine is occupied but has no active session");
    }

    // ── Verify user owns this session ──
    const [session] = await db
      .select()
      .from(machineSessions)
      .where(
        and(
          eq(machineSessions.id, machine.currentSessionId),
          eq(machineSessions.userId, ctx.user.id)
        )
      )
      .limit(1);

    if (!session) {
      return errors.forbidden("This is not your active session");
    }

    // ── Update heartbeat timestamp ──
    const now = new Date();
    await db
      .update(machineSessions)
      .set({ heartbeatAt: now })
      .where(eq(machineSessions.id, session.id));

    // Calculate how long since session started
    const elapsedMinutes = Math.round(
      (now.getTime() - new Date(session.startedAt).getTime()) / 60000
    );

    return success({
      sessionId: session.id,
      heartbeatAt: now.toISOString(),
      elapsedMinutes,
    });
  });
}
