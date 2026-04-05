import cron from "node-cron";
import { db } from "@/db";
import {
  machines,
  machineSessions,
  machineQrTokens,
  userProfiles,
  chatMessages,
  notifications,
} from "@/db/schema";
import { eq, and, lt, sql, lte } from "drizzle-orm";
import { audit } from "./logger";
import { createHash } from "crypto";

// ═══════════════════════════════════════════
// BACKGROUND JOB SYSTEM (node-cron)
// ═══════════════════════════════════════════

let initialized = false;

/**
 * Initialize all background cron jobs.
 * Call once when the server starts.
 */
export function initCronJobs() {
  if (initialized) return;
  initialized = true;

  console.log("[CRON] Initializing background jobs...");

  // ── Every 1 min: Check session heartbeats ──
  cron.schedule("* * * * *", async () => {
    try {
      await checkHeartbeats();
    } catch (err) {
      console.error("[CRON] Heartbeat check failed:", err);
    }
  });

  // ── Every 5 min: Rotate QR tokens ──
  cron.schedule("*/5 * * * *", async () => {
    try {
      await rotateQrTokens();
    } catch (err) {
      console.error("[CRON] QR rotation failed:", err);
    }
  });

  // ── Every 1 hour: Check subscription expiries ──
  cron.schedule("0 * * * *", async () => {
    try {
      await checkSubscriptionExpiries();
    } catch (err) {
      console.error("[CRON] Subscription check failed:", err);
    }
  });

  // ── Every day at 3 AM: Clean old chat messages ──
  cron.schedule("0 3 * * *", async () => {
    try {
      await cleanOldChatMessages();
    } catch (err) {
      console.error("[CRON] Chat cleanup failed:", err);
    }
  });

  // ── Every day at 4 AM: Clean expired QR tokens ──
  cron.schedule("0 4 * * *", async () => {
    try {
      await cleanExpiredQrTokens();
    } catch (err) {
      console.error("[CRON] QR cleanup failed:", err);
    }
  });

  console.log("[CRON] All background jobs initialized.");
}

// ═══════════════════════════════════════════
// JOB IMPLEMENTATIONS
// ═══════════════════════════════════════════

/**
 * Check for sessions with stale heartbeats.
 * - 15 min: auto-end session
 */
async function checkHeartbeats() {
  const now = new Date();
  const expireThreshold = new Date(now.getTime() - 15 * 60 * 1000);

  // ── Auto-end expired sessions (15+ min no heartbeat) ──
  const expiredSessions = await db
    .select()
    .from(machineSessions)
    .where(
      and(
        sql`ended_at IS NULL`,
        lt(machineSessions.heartbeatAt, expireThreshold)
      )
    );

  for (const session of expiredSessions) {
    const durationMinutes = Math.round(
      (now.getTime() - new Date(session.startedAt).getTime()) / 60000
    );

    await db
      .update(machineSessions)
      .set({
        endedAt: now,
        durationMinutes,
        wasAutoEnded: true,
      })
      .where(eq(machineSessions.id, session.id));

    // Free the machine
    await db
      .update(machines)
      .set({
        status: "free",
        currentSessionId: null,
        updatedAt: now,
      })
      .where(eq(machines.id, session.machineId));

    await audit({
      userId: session.userId,
      action: "machine.auto_ended",
      resource: "machine",
      resourceId: session.machineId,
      metadata: { sessionId: session.id, durationMinutes },
    });
  }

}

/**
 * Rotate QR token secrets for all machines.
 * The actual token is time-based (5-min buckets), but we can
 * also periodically refresh the stored valid tokens.
 */
async function rotateQrTokens() {
  const allMachines = await db.select().from(machines);

  for (const machine of allMachines) {
    if (!machine.qrSecret) continue;

    const timeBucket = Math.floor(Date.now() / (5 * 60 * 1000));
    const token = createHash("sha256")
      .update(`${machine.id}:${timeBucket}:${machine.qrSecret}`)
      .digest("hex")
      .slice(0, 32);

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(
      (Math.floor(Date.now() / (5 * 60 * 1000)) + 1) * 5 * 60 * 1000
    );

    await db.insert(machineQrTokens).values({
      machineId: machine.id,
      tokenHash,
      expiresAt,
    });
  }
}

/**
 * Check subscription expiries and downgrade users.
 */
async function checkSubscriptionExpiries() {
  const now = new Date();

  // ── Notify users: expiring in 3 days ──
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const expiringProfiles = await db
    .select()
    .from(userProfiles)
    .where(
      and(
        eq(userProfiles.subscriptionStatus, "premium"),
        lt(userProfiles.subscriptionExpiry, threeDaysFromNow),
        sql`subscription_expiry > ${now}`
      )
    );

  for (const profile of expiringProfiles) {
    // Check if we already notified (simple: check last notification)
    const [existing] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, profile.userId),
          eq(notifications.type, "subscription_expiring"),
          sql`created_at > ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}`
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(notifications).values({
        userId: profile.userId,
        type: "subscription_expiring",
        title: "⏳ Premium Expiring Soon",
        body: `Your premium subscription expires on ${profile.subscriptionExpiry?.toLocaleDateString()}. Renew to keep priority queue access!`,
      });
    }
  }

  // ── Downgrade expired subscriptions ──
  const expiredProfiles = await db
    .select()
    .from(userProfiles)
    .where(
      and(
        eq(userProfiles.subscriptionStatus, "premium"),
        lte(userProfiles.subscriptionExpiry, now)
      )
    );

  for (const profile of expiredProfiles) {
    await db
      .update(userProfiles)
      .set({
        subscriptionStatus: "expired",
        updatedAt: now,
      })
      .where(eq(userProfiles.id, profile.id));

    await db.insert(notifications).values({
      userId: profile.userId,
      type: "subscription_expired",
      title: "Premium Expired",
      body: "Your premium subscription has expired. You've been downgraded to the free plan. Renew to regain priority queue access.",
    });

    await audit({
      userId: profile.userId,
      action: "subscription.expired",
      resource: "user_profile",
      resourceId: profile.id,
    });
  }
}

/**
 * Clean up chat messages older than 7 days (hard delete soft-deleted messages).
 */
async function cleanOldChatMessages() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Hard delete soft-deleted messages older than 7 days
  await db
    .delete(chatMessages)
    .where(
      and(
        eq(chatMessages.isDeleted, true),
        lt(chatMessages.createdAt, sevenDaysAgo)
      )
    );
}

/**
 * Clean up expired QR tokens.
 */
async function cleanExpiredQrTokens() {
  const now = new Date();
  await db
    .delete(machineQrTokens)
    .where(lt(machineQrTokens.expiresAt, now));
}
