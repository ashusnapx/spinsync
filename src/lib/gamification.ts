import { db } from "@/db";
import { achievements, machineSessions, chatMessages, userProfiles, notifications } from "@/db/schema";
import { eq, and, sql, gte, lt } from "drizzle-orm";
import { audit } from "./logger";
import type { AchievementType } from "@/db/schema";

// ═══════════════════════════════════════════
// GAMIFICATION & ACHIEVEMENT SYSTEM
// ═══════════════════════════════════════════

interface AchievementDefinition {
  type: AchievementType;
  name: string;
  description: string;
  emoji: string;
  points: number;
  check: (userId: string) => Promise<boolean>;
}

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: "first_wash",
    name: "First Wash",
    description: "Complete your first laundry session",
    emoji: "🎉",
    points: 10,
    check: async (userId: string) => {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(machineSessions)
        .where(
          and(
            eq(machineSessions.userId, userId),
            sql`ended_at IS NOT NULL`
          )
        );
      return Number(result?.count || 0) >= 1;
    },
  },
  {
    type: "punctual_pro",
    name: "Punctual Pro",
    description: "Removed clothes within grace period 10 times",
    emoji: "⏰",
    points: 50,
    check: async (userId: string) => {
      // Sessions where user ended before auto-end (wasAutoEnded = false)
      // and grace period was triggered
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(machineSessions)
        .where(
          and(
            eq(machineSessions.userId, userId),
            eq(machineSessions.wasAutoEnded, false),
            sql`ended_at IS NOT NULL`,
            sql`grace_started_at IS NOT NULL`
          )
        );
      return Number(result?.count || 0) >= 10;
    },
  },
  {
    type: "early_bird",
    name: "Early Bird",
    description: "Used a machine before 7 AM 5 times",
    emoji: "🌅",
    points: 30,
    check: async (userId: string) => {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(machineSessions)
        .where(
          and(
            eq(machineSessions.userId, userId),
            sql`EXTRACT(HOUR FROM started_at) < 7`
          )
        );
      return Number(result?.count || 0) >= 5;
    },
  },
  {
    type: "community_star",
    name: "Community Star",
    description: "Sent 50+ chat messages",
    emoji: "⭐",
    points: 40,
    check: async (userId: string) => {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, userId),
            eq(chatMessages.isDeleted, false)
          )
        );
      return Number(result?.count || 0) >= 50;
    },
  },
  {
    type: "speed_demon",
    name: "Speed Demon",
    description: "Average session time under 30 minutes (min 5 sessions)",
    emoji: "⚡",
    points: 35,
    check: async (userId: string) => {
      const [result] = await db
        .select({
          count: sql<number>`count(*)`,
          avg: sql<number>`AVG(duration_minutes)`,
        })
        .from(machineSessions)
        .where(
          and(
            eq(machineSessions.userId, userId),
            sql`duration_minutes IS NOT NULL`
          )
        );
      return (
        Number(result?.count || 0) >= 5 && Number(result?.avg || 999) < 30
      );
    },
  },
  {
    type: "streak_7",
    name: "Weekly Warrior",
    description: "Used machines 7 days in a row",
    emoji: "🔥",
    points: 60,
    check: async (userId: string) => {
      // Check if user has sessions on 7 consecutive days
      const sessions = await db
        .select({
          date: sql<string>`DISTINCT DATE(started_at)`,
        })
        .from(machineSessions)
        .where(eq(machineSessions.userId, userId))
        .orderBy(sql`DATE(started_at) DESC`)
        .limit(30);

      return hasConsecutiveDays(
        sessions.map((s) => s.date),
        7
      );
    },
  },
  {
    type: "streak_30",
    name: "Monthly Master",
    description: "Used machines 30 days in a row",
    emoji: "👑",
    points: 200,
    check: async (userId: string) => {
      const sessions = await db
        .select({
          date: sql<string>`DISTINCT DATE(started_at)`,
        })
        .from(machineSessions)
        .where(eq(machineSessions.userId, userId))
        .orderBy(sql`DATE(started_at) DESC`)
        .limit(60);

      return hasConsecutiveDays(
        sessions.map((s) => s.date),
        30
      );
    },
  },
];

/**
 * Check if a list of date strings contains N consecutive days.
 */
function hasConsecutiveDays(dates: string[], n: number): boolean {
  if (dates.length < n) return false;

  const sorted = dates
    .map((d) => new Date(d).getTime())
    .sort((a, b) => b - a); // newest first

  let consecutive = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i - 1] - sorted[i];
    if (diff === 24 * 60 * 60 * 1000) {
      consecutive++;
      if (consecutive >= n) return true;
    } else if (diff > 24 * 60 * 60 * 1000) {
      consecutive = 1;
    }
    // Same day (diff = 0) doesn't reset but doesn't increment
  }

  return consecutive >= n;
}

/**
 * Check and award all eligible achievements for a user.
 * Called after sessions end, messages sent, etc.
 */
export async function checkAndAwardAchievements(
  userId: string
): Promise<AchievementType[]> {
  const awarded: AchievementType[] = [];

  // Get already-earned achievements
  const existing = await db
    .select({ type: achievements.type })
    .from(achievements)
    .where(eq(achievements.userId, userId));

  const earnedTypes = new Set(existing.map((a) => a.type));

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (earnedTypes.has(def.type)) continue;

    try {
      const eligible = await def.check(userId);
      if (eligible) {
        // Award achievement
        await db.insert(achievements).values({
          userId,
          type: def.type,
        });

        // Award points
        await db
          .update(userProfiles)
          .set({
            points: sql`points + ${def.points}`,
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.userId, userId));

        // Send notification
        await db.insert(notifications).values({
          userId,
          type: "achievement_earned",
          title: `${def.emoji} Achievement Unlocked!`,
          body: `You earned "${def.name}" — ${def.description}. +${def.points} points!`,
          metadata: { achievementType: def.type, points: def.points },
        });

        await audit({
          userId,
          action: "achievement.earned",
          resource: "achievement",
          metadata: { type: def.type, name: def.name, points: def.points },
        });

        awarded.push(def.type);
      }
    } catch (err) {
      console.error(`[GAMIFICATION] Error checking ${def.type}:`, err);
    }
  }

  return awarded;
}

/**
 * Get all achievement definitions with user's progress.
 */
export async function getUserAchievements(userId: string) {
  const earned = await db
    .select()
    .from(achievements)
    .where(eq(achievements.userId, userId));

  const earnedMap = new Map(earned.map((a) => [a.type, a.earnedAt]));

  return ACHIEVEMENT_DEFINITIONS.map((def) => ({
    type: def.type,
    name: def.name,
    description: def.description,
    emoji: def.emoji,
    points: def.points,
    earned: earnedMap.has(def.type),
    earnedAt: earnedMap.get(def.type) || null,
  }));
}
