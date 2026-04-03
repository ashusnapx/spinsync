// ═══════════════════════════════════════════
// CLIENT-SAFE GEOLOCATION UTILITIES
// ═══════════════════════════════════════════

const EARTH_RADIUS_METERS = 6371000;

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy in meters
}

export interface TrustScoreResult {
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
 * Pure math function — safe for browser/server.
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
 * Reverse Geocode: Get a human-readable address from coordinates.
 * Uses Nominatim (OpenStreetMap) — no API key required for low volume.
 * Browser-safe utility.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'DhobiQ-App/1.0',
        },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch address');

    const data = await response.json();
    return data.display_name || 'Address not found';
  } catch (error) {
    console.error('Reverse Geocode Error:', error);
    throw new Error('Could not determine physical address from GPS.');
  }
}
