import { NextRequest } from "next/server";
import { db } from "@/db";
import { pgLocations, userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { computeTrustScore, recordVerification } from "@/lib/geo-utils";
import { extractDeviceInfo, verifyDevice } from "@/lib/device-identity";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// ═══════════════════════════════════════════
// POST /api/pg/join — Join a PG by code + location
// ═══════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pgCode, roomNumber, latitude, longitude, gpsAccuracy, fingerprint } = body;

    // ── Validate input ──
    if (!pgCode || !roomNumber || latitude == null || longitude == null) {
      return errors.validation("Missing required fields: pgCode, roomNumber, latitude, longitude");
    }

    if (!fingerprint) {
      return errors.validation("Device fingerprint is required");
    }

    // ── Get authenticated user ──
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return errors.unauthorized();
    }

    const userId = session.user.id;

    // ── Look up PG by code ──
    const [pgLocation] = await db
      .select()
      .from(pgLocations)
      .where(eq(pgLocations.code, pgCode.toUpperCase()))
      .limit(1);

    if (!pgLocation) {
      return errors.notFound("PG with this code");
    }

    // ── Multi-layer location verification ──
    const trustResult = await computeTrustScore(
      userId,
      { latitude, longitude, accuracy: gpsAccuracy },
      { latitude: pgLocation.latitude, longitude: pgLocation.longitude },
      null, // IP lat (would come from IP geolocation service)
      null  // IP lng
    );

    // Record the verification attempt
    await recordVerification(
      userId,
      { latitude, longitude, accuracy: gpsAccuracy },
      trustResult.score,
      trustResult.passed,
      null,
      null
    );

    if (!trustResult.passed) {
      await audit({
        userId,
        action: "pg.join_rejected",
        resource: "pg_location",
        resourceId: pgLocation.id,
        metadata: {
          trustScore: trustResult.score,
          distance: trustResult.distanceMeters,
          details: trustResult.details,
        },
        ipAddress: getIpAddress(request),
        userAgent: getUserAgent(request),
      });

      return errors.locationFailed(
        `Location verification failed (trust score: ${trustResult.score.toFixed(2)}, distance: ${Math.round(trustResult.distanceMeters)}m). Please ensure you are at the PG location.`
      );
    }

    // ── Device verification ──
    const deviceInfo = extractDeviceInfo(request, fingerprint, latitude, longitude);
    const deviceCheck = await verifyDevice(userId, deviceInfo);

    if (!deviceCheck.trusted) {
      return errors.deviceUntrusted(deviceCheck.reason);
    }

    // ── Add user to organization ──
    try {
      await auth.api.addMember({
        headers: await headers(),
        body: {
          organizationId: pgLocation.orgId,
          userId,
          role: "member", // free_user equivalent
        },
      });
    } catch {
      // User may already be a member — that's ok
    }

    // ── Create/update user profile ──
    const [existingProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    if (!existingProfile) {
      await db.insert(userProfiles).values({
        userId,
        roomNumber,
        orgId: pgLocation.orgId,
        subscriptionStatus: "free",
        points: 0,
        totalSessions: 0,
      });
    } else {
      await db
        .update(userProfiles)
        .set({ roomNumber, orgId: pgLocation.orgId, updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId));
    }

    // ── Audit log ──
    await audit({
      userId,
      action: "pg.joined",
      resource: "pg_location",
      resourceId: pgLocation.id,
      metadata: {
        pgCode,
        roomNumber,
        trustScore: trustResult.score,
        distance: trustResult.distanceMeters,
        isNewDevice: deviceCheck.isNewDevice,
      },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({
      pgName: pgLocation.name,
      orgId: pgLocation.orgId,
      roomNumber,
      trustScore: trustResult.score,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[PG/JOIN] Error:", err);
    return errors.internal();
  }
}
