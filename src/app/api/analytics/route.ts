import { NextRequest } from "next/server";
import { db } from "@/db";
import { machineSessions, machines, queueEntries } from "@/db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireOrganization, withGuard } from "@/lib/guard";

// ═══════════════════════════════════════════
// GET /api/analytics — Usage analytics for the org
// ═══════════════════════════════════════════

export async function GET(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireOrganization(request);
    const period = request.nextUrl.searchParams.get("period") || "7d"; // 7d, 30d, all

    let dateFilter: Date;
    switch (period) {
      case "30d":
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        dateFilter = new Date(0);
        break;
      default: // 7d
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // ── Total sessions & average duration ──
    const [sessionStats] = await db
      .select({
        totalSessions: sql<number>`count(*)`,
        avgDuration: sql<number>`COALESCE(AVG(duration_minutes), 0)`,
        totalMinutes: sql<number>`COALESCE(SUM(duration_minutes), 0)`,
      })
      .from(machineSessions)
      .where(
        and(
          eq(machineSessions.orgId, ctx.orgId),
          gte(machineSessions.startedAt, dateFilter)
        )
      );

    // ── Sessions per machine ──
    const machineUsage = await db
      .select({
        machineId: machineSessions.machineId,
        machineName: machines.name,
        machineType: machines.type,
        sessionCount: sql<number>`count(*)`,
        avgDuration: sql<number>`COALESCE(AVG(${machineSessions.durationMinutes}), 0)`,
      })
      .from(machineSessions)
      .innerJoin(machines, eq(machineSessions.machineId, machines.id))
      .where(
        and(
          eq(machineSessions.orgId, ctx.orgId),
          gte(machineSessions.startedAt, dateFilter)
        )
      )
      .groupBy(machineSessions.machineId, machines.name, machines.type)
      .orderBy(desc(sql`count(*)`));

    // ── Peak usage hours (hour of day → session count) ──
    const peakHours = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM started_at)`,
        count: sql<number>`count(*)`,
      })
      .from(machineSessions)
      .where(
        and(
          eq(machineSessions.orgId, ctx.orgId),
          gte(machineSessions.startedAt, dateFilter)
        )
      )
      .groupBy(sql`EXTRACT(HOUR FROM started_at)`)
      .orderBy(sql`EXTRACT(HOUR FROM started_at)`);

    // ── Sessions per day (for chart) ──
    const dailySessions = await db
      .select({
        date: sql<string>`DATE(started_at)`,
        count: sql<number>`count(*)`,
      })
      .from(machineSessions)
      .where(
        and(
          eq(machineSessions.orgId, ctx.orgId),
          gte(machineSessions.startedAt, dateFilter)
        )
      )
      .groupBy(sql`DATE(started_at)`)
      .orderBy(sql`DATE(started_at)`);

    // ── Current queue lengths ──
    const queueLengths = await db
      .select({
        machineId: queueEntries.machineId,
        machineName: machines.name,
        queueLength: sql<number>`count(*)`,
      })
      .from(queueEntries)
      .innerJoin(machines, eq(queueEntries.machineId, machines.id))
      .where(eq(queueEntries.orgId, ctx.orgId))
      .groupBy(queueEntries.machineId, machines.name);

    // ── Auto-ended sessions (abandoned) ──
    const [abandonedStats] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(machineSessions)
      .where(
        and(
          eq(machineSessions.orgId, ctx.orgId),
          eq(machineSessions.wasAutoEnded, true),
          gte(machineSessions.startedAt, dateFilter)
        )
      );

    return success({
      period,
      overview: {
        totalSessions: Number(sessionStats?.totalSessions || 0),
        avgDurationMinutes: Math.round(Number(sessionStats?.avgDuration || 0)),
        totalUsageMinutes: Number(sessionStats?.totalMinutes || 0),
        abandonedSessions: Number(abandonedStats?.count || 0),
      },
      machineUsage,
      peakHours: peakHours.map((h) => ({
        hour: Number(h.hour),
        sessions: Number(h.count),
      })),
      dailySessions: dailySessions.map((d) => ({
        date: d.date,
        sessions: Number(d.count),
      })),
      currentQueues: queueLengths.map((q) => ({
        machineId: q.machineId,
        machineName: q.machineName,
        length: Number(q.queueLength),
      })),
    });
  });
}
