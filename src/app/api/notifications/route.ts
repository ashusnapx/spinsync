import { NextRequest } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireAuth, withGuard } from "@/lib/guard";

// ═══════════════════════════════════════════
// GET /api/notifications — Get user's notifications
// ═══════════════════════════════════════════

export async function GET(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireAuth(request);
    const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "20"),
      50
    );

    const conditions = [eq(notifications.userId, ctx.user.id)];
    if (unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }

    const notificationList = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    // Get unread count
    const [unreadCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.read, false)
        )
      );

    return success({
      notifications: notificationList,
      unreadCount: Number(unreadCountResult?.count || 0),
    });
  });
}

// ═══════════════════════════════════════════
// PATCH /api/notifications — Mark notification(s) as read
// ═══════════════════════════════════════════

export async function PATCH(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireAuth(request);
    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      // Mark all as read
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.userId, ctx.user.id),
            eq(notifications.read, false)
          )
        );

      return success({ markedAllRead: true });
    }

    if (!notificationId) {
      return errors.validation("notificationId or markAllRead is required");
    }

    // Mark single as read
    const result = await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, ctx.user.id)
        )
      );

    if ((result.rowCount ?? 0) === 0) {
      return errors.notFound("Notification");
    }

    return success({ read: true });
  });
}
