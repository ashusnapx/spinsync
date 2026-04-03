import { db } from "@/db";
import { deviceIdentities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";
import { audit, getIpAddress, getUserAgent } from "./logger";

// ═══════════════════════════════════════════
// MULTI-FACTOR DEVICE IDENTITY SYSTEM
// ═══════════════════════════════════════════

interface DeviceInfo {
  fingerprint: string;         // Client-side browser fingerprint
  userAgent: string | null;
  ipAddress: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface DeviceCheckResult {
  trusted: boolean;
  isNewDevice: boolean;
  reason?: string;
}

/**
 * Hash an IP address for storage (privacy-preserving).
 */
function hashIp(ip: string): string {
  return createHash("sha256")
    .update(ip + (process.env.IP_HASH_SALT || "spinsync-salt"))
    .digest("hex")
    .slice(0, 32);
}

/**
 * Verify or register a device for a user.
 * Returns trust status and whether this is a new device.
 */
export async function verifyDevice(
  userId: string,
  device: DeviceInfo
): Promise<DeviceCheckResult> {
  const ipHash = device.ipAddress ? hashIp(device.ipAddress) : null;

  // Look for existing device with this fingerprint for this user
  const [existingDevice] = await db
    .select()
    .from(deviceIdentities)
    .where(
      and(
        eq(deviceIdentities.userId, userId),
        eq(deviceIdentities.fingerprint, device.fingerprint)
      )
    )
    .limit(1);

  // ── New device ──
  if (!existingDevice) {
    await db.insert(deviceIdentities).values({
      userId,
      fingerprint: device.fingerprint,
      userAgent: device.userAgent,
      ipHash,
      lastLocationLat: device.latitude ?? null,
      lastLocationLng: device.longitude ?? null,
      isTrusted: true,
    });

    await audit({
      userId,
      action: "security.device_new",
      resource: "device",
      metadata: {
        fingerprint: device.fingerprint.slice(0, 8) + "...",
        userAgent: device.userAgent?.slice(0, 50),
      },
    });

    return { trusted: true, isNewDevice: true };
  }

  // ── Known device — check for anomalies ──
  let mismatchCount = 0;
  const mismatches: string[] = [];

  // User agent mismatch (different browser/version is suspicious)
  if (
    existingDevice.userAgent &&
    device.userAgent &&
    !userAgentFamilyMatch(existingDevice.userAgent, device.userAgent)
  ) {
    mismatchCount++;
    mismatches.push("user_agent");
  }

  // IP hash mismatch (different network is mild signal)
  if (existingDevice.ipHash && ipHash && existingDevice.ipHash !== ipHash) {
    mismatchCount += 0.5; // Less weight — people move between networks
    mismatches.push("ip_hash");
  }

  // Update last seen + location
  await db
    .update(deviceIdentities)
    .set({
      lastSeen: new Date(),
      ipHash: ipHash ?? existingDevice.ipHash,
      lastLocationLat: device.latitude ?? existingDevice.lastLocationLat,
      lastLocationLng: device.longitude ?? existingDevice.lastLocationLng,
      userAgent: device.userAgent ?? existingDevice.userAgent,
    })
    .where(eq(deviceIdentities.id, existingDevice.id));

  // ── Flag if too many mismatches ──
  if (mismatchCount >= 1.5) {
    await db
      .update(deviceIdentities)
      .set({ isTrusted: false })
      .where(eq(deviceIdentities.id, existingDevice.id));

    await audit({
      userId,
      action: "security.device_mismatch",
      resource: "device",
      resourceId: existingDevice.id,
      metadata: { mismatches },
    });

    return {
      trusted: false,
      isNewDevice: false,
      reason: `Device identity mismatch: ${mismatches.join(", ")}`,
    };
  }

  return { trusted: true, isNewDevice: false };
}

/**
 * Get device info from a request and client fingerprint.
 */
export function extractDeviceInfo(
  request: Request,
  fingerprint: string,
  latitude?: number | null,
  longitude?: number | null
): DeviceInfo {
  return {
    fingerprint,
    userAgent: getUserAgent(request),
    ipAddress: getIpAddress(request),
    latitude,
    longitude,
  };
}

/**
 * Compare user agent "families" (same browser, ignore version differences).
 * e.g., "Chrome/120" and "Chrome/121" are the same family.
 */
function userAgentFamilyMatch(ua1: string, ua2: string): boolean {
  const extractFamily = (ua: string): string => {
    // Extract main browser identifier
    const browsers = ["Chrome", "Firefox", "Safari", "Edge", "Opera"];
    for (const browser of browsers) {
      if (ua.includes(browser)) return browser;
    }
    return ua.split("/")[0] || ua;
  };

  // Also check OS family
  const extractOs = (ua: string): string => {
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    return "unknown";
  };

  return extractFamily(ua1) === extractFamily(ua2) && extractOs(ua1) === extractOs(ua2);
}

/**
 * Get all trusted devices for a user.
 */
export async function getUserDevices(userId: string) {
  return db
    .select()
    .from(deviceIdentities)
    .where(eq(deviceIdentities.userId, userId));
}

/**
 * Mark a specific device as untrusted (admin or user action).
 */
export async function revokeDevice(
  userId: string,
  deviceId: string
): Promise<boolean> {
  const result = await db
    .update(deviceIdentities)
    .set({ isTrusted: false })
    .where(
      and(
        eq(deviceIdentities.id, deviceId),
        eq(deviceIdentities.userId, userId)
      )
    );

  return (result.rowCount ?? 0) > 0;
}
