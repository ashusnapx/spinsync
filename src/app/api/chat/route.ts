import { NextRequest } from "next/server";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, and, desc, lt } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireOrganization, withGuard } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";

// ═══════════════════════════════════════════
// In-memory rate limiting for chat (per-process)
// ═══════════════════════════════════════════

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_MESSAGES_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_MESSAGES_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}

// ═══════════════════════════════════════════
// GET /api/chat — Get chat messages for active org
// ═══════════════════════════════════════════

export async function GET(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireOrganization(request);
    const before = request.nextUrl.searchParams.get("before"); // cursor pagination
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "50"),
      100
    );
    const beforeDate = before ? new Date(before) : null;

    await purgeExpiredChatMessages();

    const query = db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.orgId, ctx.orgId),
          eq(chatMessages.isDeleted, false),
          ...(beforeDate ? [lt(chatMessages.createdAt, beforeDate)] : [])
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    const messages = await query;

    return success({
      messages: messages.reverse(), // chronological order
      hasMore: messages.length === limit,
    });
  });
}

// ═══════════════════════════════════════════
// POST /api/chat — Send a chat message
// ═══════════════════════════════════════════

export async function POST(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireOrganization(request);
    const body = await request.json();
    const { content } = body;

    await purgeExpiredChatMessages();

    if (!content || typeof content !== "string") {
      return errors.validation("Message content is required");
    }

    if (content.trim().length === 0 || content.length > 500) {
      return errors.validation("Message must be between 1 and 500 characters");
    }

    // ── Rate limit check ──
    if (!checkRateLimit(ctx.user.id)) {
      await audit({
        userId: ctx.user.id,
        action: "chat.rate_limited",
        resource: "chat",
        metadata: { orgId: ctx.orgId },
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      });

      return errors.rateLimited("You're sending messages too fast. Max 10 per minute.");
    }

    // ── Insert message ──
    const [message] = await db
      .insert(chatMessages)
      .values({
        orgId: ctx.orgId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        content: content.trim(),
      })
      .returning();

    await audit({
      userId: ctx.user.id,
      action: "chat.message_sent",
      resource: "chat",
      resourceId: message.id,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success(message, 201);
  });
}

// ═══════════════════════════════════════════
// DELETE /api/chat — Delete a message (admin or owner)
// ═══════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireOrganization(request);
    const messageId = request.nextUrl.searchParams.get("messageId");

    if (!messageId) {
      return errors.validation("messageId query parameter is required");
    }

    // Find the message
    const [message] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);

    if (!message) {
      return errors.notFound("Message");
    }

    // Only message owner or admin can delete
    if (
      message.userId !== ctx.user.id &&
      ctx.orgRole !== "owner" &&
      ctx.orgRole !== "pg_admin"
    ) {
      return errors.forbidden("Only message owner or admin can delete messages");
    }

    // Soft-delete
    await db
      .update(chatMessages)
      .set({ isDeleted: true })
      .where(eq(chatMessages.id, messageId));

    await audit({
      userId: ctx.user.id,
      action: "chat.message_deleted",
      resource: "chat",
      resourceId: messageId,
      metadata: { originalUserId: message.userId },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({ deleted: true });
  });
}

async function purgeExpiredChatMessages() {
  await db
    .delete(chatMessages)
    .where(lt(chatMessages.createdAt, getStartOfTodayInIst()));
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
