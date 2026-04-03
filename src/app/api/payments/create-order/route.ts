import { NextRequest } from "next/server";
import { db } from "@/db";
import { payments, userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireOrganization, withGuard } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";
import Razorpay from "razorpay";

// ═══════════════════════════════════════════
// POST /api/payments/create-order — Create Razorpay order
// ═══════════════════════════════════════════

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

const PREMIUM_AMOUNT_PAISE = 29900; // ₹299/month

export async function POST(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireOrganization(request);

    // ── Check if already premium ──
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, ctx.user.id))
      .limit(1);

    if (profile?.subscriptionStatus === "premium") {
      return errors.conflict("You already have an active premium subscription");
    }

    // ── Create Razorpay order ──
    const order = await razorpay.orders.create({
      amount: PREMIUM_AMOUNT_PAISE,
      currency: "INR",
      receipt: `spinsync_${ctx.user.id}_${Date.now()}`,
      notes: {
        userId: ctx.user.id,
        orgId: ctx.orgId,
        plan: "premium_monthly",
      },
    });

    // ── Store payment record ──
    await db.insert(payments).values({
      userId: ctx.user.id,
      orgId: ctx.orgId,
      razorpayOrderId: order.id,
      amount: PREMIUM_AMOUNT_PAISE,
      currency: "INR",
      status: "created",
      plan: "premium_monthly",
    });

    await audit({
      userId: ctx.user.id,
      action: "payment.order_created",
      resource: "payment",
      metadata: { orderId: order.id, amount: PREMIUM_AMOUNT_PAISE },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({
      orderId: order.id,
      amount: PREMIUM_AMOUNT_PAISE,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  });
}
