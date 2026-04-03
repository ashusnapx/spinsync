import { NextRequest } from "next/server";
import { db } from "@/db";
import { machines, machineQrTokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireRole, requireOrganization, requireResourceAccess, withGuard } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";
import { createHash } from "crypto";
import QRCode from "qrcode";

// ═══════════════════════════════════════════
// GET /api/machines/[id]/qr — Get current QR code (admin only)
// ═══════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withGuard(async () => {
    const { id: machineId } = await params;
    const ctx = await requireRole(request, "pg_admin", "owner");

    const [machine] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, machineId))
      .limit(1);

    if (!machine) return errors.notFound("Machine");
    requireResourceAccess(ctx, machine.orgId);

    // Generate rotating token
    const token = generateRotatingToken(machineId, machine.qrSecret || "");
    const expiresAt = getTokenExpiry();

    // Store the token hash
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.insert(machineQrTokens).values({
      machineId,
      tokenHash,
      expiresAt,
    });

    // Generate QR code as data URL
    const qrPayload = JSON.stringify({
      machineId,
      token,
      expiresAt: expiresAt.toISOString(),
    });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 300,
      margin: 2,
      color: {
        dark: "#00d4ff",
        light: "#0a0a0f",
      },
    });

    return success({
      qrDataUrl,
      expiresAt: expiresAt.toISOString(),
      machineId,
      machineName: machine.name,
    });
  });
}

// ═══════════════════════════════════════════
// POST /api/machines/[id]/qr — Validate a scanned QR token
// ═══════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withGuard(async () => {
    const { id: machineId } = await params;
    const ctx = await requireOrganization(request);
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return errors.validation("QR token is required");
    }

    // ── Verify token ──
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [validToken] = await db
      .select()
      .from(machineQrTokens)
      .where(
        and(
          eq(machineQrTokens.machineId, machineId),
          eq(machineQrTokens.tokenHash, tokenHash),
          gt(machineQrTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!validToken) {
      return errors.validation("Invalid or expired QR code. Please scan the current QR code.");
    }

    await audit({
      userId: ctx.user.id,
      action: "machine.qr_scanned",
      resource: "machine",
      resourceId: machineId,
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({
      valid: true,
      machineId,
      message: "QR code verified. You can now start the machine.",
    });
  });
}

// ── Helpers ──

/**
 * Generate a rotating token based on machine ID, secret, and current time bucket.
 * Token rotates every 5 minutes.
 */
function generateRotatingToken(machineId: string, secret: string): string {
  const timeBucket = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-min buckets
  return createHash("sha256")
    .update(`${machineId}:${timeBucket}:${secret}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Get the expiry time for the current token bucket (end of current 5-min window).
 */
function getTokenExpiry(): Date {
  const bucketSize = 5 * 60 * 1000;
  const currentBucket = Math.floor(Date.now() / bucketSize);
  return new Date((currentBucket + 1) * bucketSize);
}
