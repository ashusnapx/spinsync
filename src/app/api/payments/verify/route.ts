import { NextRequest } from "next/server";
import { db } from "@/db";
import { payments, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireOrganization, withGuard } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";
import { createHmac } from "crypto";

// ═══════════════════════════════════════════
// POST /api/payments/verify — Verify Razorpay payment
// ═══════════════════════════════════════════

export async function POST(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireOrganization(request);
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errors.validation("Missing payment verification fields");
    }

    // ── Verify signature ──
    const generatedSignature = createHmac(
      "sha256",
      process.env.RAZORPAY_KEY_SECRET || ""
    )
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      await audit({
        userId: ctx.user.id,
        action: "payment.failed",
        resource: "payment",
        metadata: { orderId: razorpay_order_id, reason: "invalid_signature" },
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      });

      return errors.validation("Payment signature verification failed");
    }

    // ── Update payment record ──
    const [payment] = await db
      .update(payments)
      .set({
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "captured",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(payments.razorpayOrderId, razorpay_order_id),
          eq(payments.userId, ctx.user.id)
        )
      )
      .returning();

    if (!payment) {
      return errors.notFound("Payment order");
    }

    // ── Upgrade user to premium ──
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30); // 30 days

    await db
      .update(userProfiles)
      .set({
        subscriptionStatus: "premium",
        subscriptionExpiry,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, ctx.user.id));

    await audit({
      userId: ctx.user.id,
      action: "subscription.upgraded",
      resource: "payment",
      resourceId: payment.id,
      metadata: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        expiresAt: subscriptionExpiry.toISOString(),
      },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({
      status: "premium",
      expiresAt: subscriptionExpiry.toISOString(),
      paymentId: razorpay_payment_id,
    });
  });
}
