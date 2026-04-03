import { db } from "@/db";
import { auditLogs } from "@/db/schema";

// ═══════════════════════════════════════════
// AUDIT LOGGING SYSTEM
// ═══════════════════════════════════════════

export type AuditAction =
  // Auth events
  | "auth.login"
  | "auth.logout"
  | "auth.signup"
  | "auth.login_failed"
  | "auth.2fa_enabled"
  | "auth.2fa_verified"
  | "auth.password_changed"
  // PG events
  | "pg.created"
  | "pg.joined"
  | "pg.join_rejected"
  // Machine events
  | "machine.created"
  | "machine.started"
  | "machine.stopped"
  | "machine.grace_period"
  | "machine.locked"
  | "machine.maintenance"
  | "machine.deleted"
  | "machine.updated"
  | "machine.heartbeat_missed"
  | "machine.auto_ended"
  | "machine.qr_scanned"
  // Queue events
  | "queue.joined"
  | "queue.left"
  | "queue.turn_notified"
  // Payment events
  | "payment.order_created"
  | "payment.verified"
  | "payment.failed"
  | "payment.refunded"
  | "subscription.upgraded"
  | "subscription.expired"
  | "subscription.downgraded"
  // Chat events
  | "chat.message_sent"
  | "chat.message_deleted"
  | "chat.user_blocked"
  | "chat.rate_limited"
  // Security events
  | "security.device_new"
  | "security.device_mismatch"
  | "security.location_suspicious"
  | "security.location_rejected"
  // Achievement events
  | "achievement.earned";

export interface LogEntry {
  userId?: string | null;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Write an audit log entry to the database.
 * Fire-and-forget — errors are logged to console but don't propagate.
 */
export async function audit(entry: LogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId ?? null,
      action: entry.action,
      resource: entry.resource ?? null,
      resourceId: entry.resourceId ?? null,
      metadata: entry.metadata ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    });
  } catch (err) {
    console.error("[AUDIT] Failed to write log:", err);
  }
}

/**
 * Extract IP address from request headers (respecting proxies).
 */
export function getIpAddress(request: Request): string | null {
  const headers = new Headers(request.headers);
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null
  );
}

/**
 * Extract User-Agent from request headers.
 */
export function getUserAgent(request: Request): string | null {
  return request.headers.get("user-agent");
}
