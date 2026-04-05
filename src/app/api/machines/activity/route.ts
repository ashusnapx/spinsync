import { NextRequest } from "next/server";
import { and, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { machineSessions, machines } from "@/db/schema";
import { success } from "@/lib/api-response";
import { requireOrganization, withGuard } from "@/lib/guard";
import { getOrgUserDisplayMap } from "@/lib/org-user-display";

export async function GET(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireOrganization(request);
    const startOfTodayInIst = getStartOfTodayInIst();

    const activeSessions = await db
      .select({
        id: machineSessions.id,
        machineId: machineSessions.machineId,
        userId: machineSessions.userId,
        machineName: machines.name,
        machineType: machines.type,
        startedAt: machineSessions.startedAt,
        endedAt: machineSessions.endedAt,
        durationMinutes: machineSessions.durationMinutes,
        stoppedByUserName: sql<string | null>`null`,
      })
      .from(machineSessions)
      .innerJoin(machines, eq(machineSessions.machineId, machines.id))
      .where(
        and(
          eq(machineSessions.orgId, ctx.orgId),
          isNull(machineSessions.endedAt)
        )
      )
      .orderBy(desc(machineSessions.startedAt))
      .limit(8);

    const recentClosedSessions = await db
      .select({
        id: machineSessions.id,
        machineId: machineSessions.machineId,
        userId: machineSessions.userId,
        machineName: machines.name,
        machineType: machines.type,
        startedAt: machineSessions.startedAt,
        endedAt: machineSessions.endedAt,
        durationMinutes: machineSessions.durationMinutes,
        stoppedByUserName: sql<string | null>`null`,
      })
      .from(machineSessions)
      .innerJoin(machines, eq(machineSessions.machineId, machines.id))
      .where(
        and(
          eq(machineSessions.orgId, ctx.orgId),
          isNotNull(machineSessions.endedAt),
          gte(machineSessions.endedAt, startOfTodayInIst)
        )
      )
      .orderBy(desc(machineSessions.endedAt))
      .limit(12);

    const recentClosedSessionIds = recentClosedSessions.map((session) => session.id);
    const stopAuditRows = recentClosedSessionIds.length
      ? (
          await db.execute(sql`
            select distinct on ((metadata->>'sessionId'))
              metadata->>'sessionId' as session_id,
              user_id
            from audit_logs
            where action = 'machine.stopped'
              and metadata->>'sessionId' in (${sql.join(
                recentClosedSessionIds.map((sessionId) => sql`${sessionId}`),
                sql`, `
              )})
            order by (metadata->>'sessionId'), created_at desc
          `)
        ).rows as Array<{
          session_id: string;
          user_id: string | null;
        }>
      : [];
    const stopAuditBySessionId = new Map(
      stopAuditRows.map((row) => [row.session_id, row.user_id])
    );

    const userDisplayMap = await getOrgUserDisplayMap(ctx.orgId, [
      ...activeSessions.map((session) => session.userId),
      ...recentClosedSessions.map((session) => session.userId),
      ...stopAuditRows
        .map((row) => row.user_id)
        .filter((userId): userId is string => Boolean(userId)),
    ]);

    return success({
      activeSessions: activeSessions.map((session) => ({
        ...session,
        userName: userDisplayMap.get(session.userId)?.chatLabel ?? "Resident",
      })),
      recentClosedSessions: recentClosedSessions.map((session) => ({
        ...session,
        userName: userDisplayMap.get(session.userId)?.chatLabel ?? "Resident",
        stoppedByUserName: (() => {
          const stoppedByUserId = stopAuditBySessionId.get(session.id);

          if (!stoppedByUserId || stoppedByUserId === session.userId) {
            return null;
          }

          return (
            userDisplayMap.get(stoppedByUserId)?.chatLabel ?? "Another resident"
          );
        })(),
      })),
      lastUpdatedAt: new Date().toISOString(),
    });
  });
}

function getStartOfTodayInIst() {
  const formattedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new Date(`${formattedDate}T00:00:00+05:30`);
}
