import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, userProfiles, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHmac } from "crypto";
import { audit } from "@/lib/logger";

// ═══════════════════════════════════════════
// POST /api/payments/webhook — Razorpay webhook handler
// Handles async payment events (refund, failure, etc.)
// ═══════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    // ── Verify webhook signature ──
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const expectedSignature = createHmac(
      "sha256",
      process.env.RAZORPAY_WEBHOOK_SECRET || ""
    )
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;
    const payload = event.payload;

    switch (eventType) {
      case "payment.captured": {
        const paymentEntity = payload.payment?.entity;
        if (paymentEntity) {
          await db
            .update(payments)
            .set({
              status: "captured",
              razorpayPaymentId: paymentEntity.id,
              updatedAt: new Date(),
            })
            .where(eq(payments.razorpayOrderId, paymentEntity.order_id));

          await audit({
            action: "payment.verified",
            resource: "payment",
            metadata: { paymentId: paymentEntity.id, orderId: paymentEntity.order_id },
          });
        }
        break;
      }

      case "payment.failed": {
        const paymentEntity = payload.payment?.entity;
        if (paymentEntity) {
          await db
            .update(payments)
            .set({
              status: "failed",
              razorpayPaymentId: paymentEntity.id,
              updatedAt: new Date(),
            })
            .where(eq(payments.razorpayOrderId, paymentEntity.order_id));

          // Notify user
          const userId = paymentEntity.notes?.userId;
          if (userId) {
            await db.insert(notifications).values({
              userId,
              type: "system",
              title: "Payment Failed",
              body: "Your premium subscription payment failed. Please try again.",
            });
          }

          await audit({
            userId,
            action: "payment.failed",
            resource: "payment",
            metadata: { paymentId: paymentEntity.id, reason: paymentEntity.error_description },
          });
        }
        break;
      }

      case "refund.created": {
        const refundEntity = payload.refund?.entity;
        if (refundEntity) {
          await db
            .update(payments)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(eq(payments.razorpayPaymentId, refundEntity.payment_id));

          // Downgrade user
          const paymentRecord = await db
            .select()
            .from(payments)
            .where(eq(payments.razorpayPaymentId, refundEntity.payment_id))
            .limit(1);

          if (paymentRecord[0]) {
            await db
              .update(userProfiles)
              .set({
                subscriptionStatus: "free",
                subscriptionExpiry: null,
                updatedAt: new Date(),
              })
              .where(eq(userProfiles.userId, paymentRecord[0].userId));

            await db.insert(notifications).values({
              userId: paymentRecord[0].userId,
              type: "system",
              title: "Subscription Refunded",
              body: "Your premium subscription has been refunded and downgraded to free.",
            });

            await audit({
              userId: paymentRecord[0].userId,
              action: "payment.refunded",
              resource: "payment",
              metadata: { refundId: refundEntity.id, paymentId: refundEntity.payment_id },
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[WEBHOOK] Error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
