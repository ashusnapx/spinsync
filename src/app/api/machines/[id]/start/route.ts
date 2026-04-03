import { NextRequest } from "next/server";
import { db } from "@/db";
import { machines, machineSessions, queueEntries } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireOrganization, requireResourceAccess, withGuard } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";

// ═══════════════════════════════════════════
// POST /api/machines/[id]/start — Start using a machine
// Uses atomic DB-level locking to prevent race conditions
// ═══════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withGuard(async () => {
    const { id: machineId } = await params;
    const ctx = await requireOrganization(request);

    // ── Atomic lock: only succeeds if machine is currently 'free' ──
    // This is the key race-condition prevention: the WHERE clause ensures
    // only ONE concurrent request can succeed
    const result = await db.execute(sql`
      UPDATE machines 
      SET status = 'occupied', 
          current_session_id = gen_random_uuid(),
          updated_at = NOW()
      WHERE id = ${machineId} 
        AND status = 'free' 
        AND org_id = ${ctx.orgId}
      RETURNING *
    `);

    const updated = result.rows?.[0];
    if (!updated) {
      // Either machine doesn't exist, wrong org, or not free
      const [machine] = await db
        .select()
        .from(machines)
        .where(eq(machines.id, machineId))
        .limit(1);

      if (!machine) return errors.notFound("Machine");
      if (machine.orgId !== ctx.orgId)
        return errors.forbidden("Machine belongs to a different organization");
      return errors.machineUnavailable(
        `Machine is currently ${machine.status.replace("_", " ")}`
      );
    }

    // ── Create session record ──
    const [session] = await db
      .insert(machineSessions)
      .values({
        machineId,
        userId: ctx.user.id,
        orgId: ctx.orgId,
        heartbeatAt: new Date(),
      })
      .returning();

    // ── Update machine with session ID ──
    await db
      .update(machines)
      .set({ currentSessionId: session.id })
      .where(eq(machines.id, machineId));

    // ── Remove user from queue for this machine (if they were queued) ──
    await db
      .delete(queueEntries)
      .where(
        and(
          eq(queueEntries.machineId, machineId),
          eq(queueEntries.userId, ctx.user.id)
        )
      );

    await audit({
      userId: ctx.user.id,
      action: "machine.started",
      resource: "machine",
      resourceId: machineId,
      metadata: { sessionId: session.id },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({
      machine: updated,
      session: {
        id: session.id,
        startedAt: session.startedAt,
      },
    });
  });
}
