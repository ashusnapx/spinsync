import { db } from "@/db";
import { locationVerifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// ═══════════════════════════════════════════
// MULTI-LAYER LOCATION TRUST SCORE
// ═══════════════════════════════════════════

const EARTH_RADIUS_METERS = 6371000;
const MAX_ALLOWED_DISTANCE_METERS = 50;
const TRUST_THRESHOLD = 0.6; // minimum trust to pass

interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy in meters
}

interface TrustScoreResult {
  score: number;
  passed: boolean;
  details: {
    gpsProximity: number;        // 0-0.4
    ipMatch: number;             // 0-0.2
    sessionHistory: number;      // 0-0.2
    deviceConsistency: number;   // 0-0.2
  };
  distanceMeters: number;
}

/**
 * Haversine formula — distance between two GPS coordinates in meters.
 */
export function haversineDistance(
  a: GpsCoordinates,
  b: GpsCoordinates
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * Score GPS proximity (0 – 0.4).
 * 0m = 0.4, MAX_ALLOWED_DISTANCE_METERS = 0.0
 */
function scoreGpsProximity(distanceMeters: number, accuracy?: number): number {
  // Account for GPS inaccuracy: if accuracy > 50m, be more lenient
  const effectiveMax = Math.max(MAX_ALLOWED_DISTANCE_METERS, accuracy || 0);
  if (distanceMeters <= effectiveMax) {
    return 0.4 * (1 - distanceMeters / effectiveMax);
  }
  return 0;
}

/**
 * Score IP-based location match (0 – 0.2).
 * IP geolocation is typically city-level (±5km accuracy).
 */
function scoreIpMatch(
  gps: GpsCoordinates,
  ipLat?: number | null,
  ipLng?: number | null
): number {
  if (ipLat == null || ipLng == null) return 0.1; // Partial credit if no IP data
  const dist = haversineDistance(gps, { latitude: ipLat, longitude: ipLng });
  // Within 10km = full score, 50km = 0
  if (dist <= 10000) return 0.2;
  if (dist <= 50000) return 0.2 * (1 - (dist - 10000) / 40000);
  return 0;
}

/**
 * Score session history (0 – 0.2).
 * Users who have verified from this location before get higher trust.
 */
async function scoreSessionHistory(userId: string): Promise<number> {
  const recentVerifications = await db
    .select()
    .from(locationVerifications)
    .where(eq(locationVerifications.userId, userId))
    .orderBy(desc(locationVerifications.createdAt))
    .limit(10);

  if (recentVerifications.length === 0) return 0.05; // First-time user gets partial credit
  const passedCount = recentVerifications.filter((v) => v.passed).length;
  return 0.2 * (passedCount / recentVerifications.length);
}

/**
 * Score device consistency (0 – 0.2).
 * Detects impossible location jumps (e.g., 500km in 5 minutes).
 */
async function scoreDeviceConsistency(
  userId: string,
  currentGps: GpsCoordinates
): Promise<number> {
  const [lastVerification] = await db
    .select()
    .from(locationVerifications)
    .where(eq(locationVerifications.userId, userId))
    .orderBy(desc(locationVerifications.createdAt))
    .limit(1);

  if (!lastVerification) return 0.15; // No history → partial credit

  const timeDiffMs =
    Date.now() - new Date(lastVerification.createdAt).getTime();
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

  const distance = haversineDistance(currentGps, {
    latitude: lastVerification.gpsLat,
    longitude: lastVerification.gpsLng,
  });

  // Speed check: average human max travel speed ~120 km/h
  const maxPossibleDistance = timeDiffHours * 120000; // meters
  if (distance > maxPossibleDistance && timeDiffHours < 24) {
    return 0; // Impossible jump detected
  }

  return 0.2;
}

/**
 * Compute the full multi-layer trust score for a user's location claim.
 */
export async function computeTrustScore(
  userId: string,
  userGps: GpsCoordinates,
  pgLocation: GpsCoordinates,
  ipLat?: number | null,
  ipLng?: number | null
): Promise<TrustScoreResult> {
  const distanceMeters = haversineDistance(userGps, pgLocation);

  const gpsProximity = scoreGpsProximity(distanceMeters, userGps.accuracy);
  const ipMatch = scoreIpMatch(userGps, ipLat, ipLng);
  const sessionHistory = await scoreSessionHistory(userId);
  const deviceConsistency = await scoreDeviceConsistency(userId, userGps);

  const score = gpsProximity + ipMatch + sessionHistory + deviceConsistency;

  return {
    score,
    passed: score >= TRUST_THRESHOLD,
    details: { gpsProximity, ipMatch, sessionHistory, deviceConsistency },
    distanceMeters,
  };
}

/**
 * Record a verification attempt in the database.
 */
export async function recordVerification(
  userId: string,
  gps: GpsCoordinates,
  trustScore: number,
  passed: boolean,
  ipLat?: number | null,
  ipLng?: number | null
): Promise<void> {
  await db.insert(locationVerifications).values({
    userId,
    gpsLat: gps.latitude,
    gpsLng: gps.longitude,
    gpsAccuracy: gps.accuracy ?? null,
    ipLat: ipLat ?? null,
    ipLng: ipLng ?? null,
    trustScore,
    passed,
  });
}
