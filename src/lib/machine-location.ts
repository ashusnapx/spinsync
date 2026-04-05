import { haversineDistance, type GpsCoordinates } from "@/lib/geo-utils";

export const MAX_MACHINE_START_DISTANCE_METERS = 35;
export const MAX_MACHINE_GPS_ACCURACY_METERS = 75;

export function normalizeCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function isValidLatitude(value: number | null): value is number {
  return value !== null && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number | null): value is number {
  return value !== null && value >= -180 && value <= 180;
}

export function normalizeAccuracy(value: unknown): number | null {
  const parsed = normalizeCoordinate(value);

  if (parsed === null || parsed < 0) {
    return null;
  }

  return parsed;
}

export function getAllowedMachineStartRadius(accuracy: number | null) {
  if (accuracy === null) {
    return 20;
  }

  return Math.max(20, Math.min(accuracy, MAX_MACHINE_START_DISTANCE_METERS));
}

export function isMachineStartLocationAllowed(
  userLocation: GpsCoordinates,
  machineLocation: GpsCoordinates
) {
  const distanceMeters = haversineDistance(userLocation, machineLocation);
  const allowedRadiusMeters = getAllowedMachineStartRadius(
    normalizeAccuracy(userLocation.accuracy)
  );

  return {
    distanceMeters,
    allowedRadiusMeters,
    passed: distanceMeters <= allowedRadiusMeters,
  };
}

export function formatMachineCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined
) {
  if (
    typeof latitude !== "number" ||
    Number.isNaN(latitude) ||
    typeof longitude !== "number" ||
    Number.isNaN(longitude)
  ) {
    return "Coordinates unavailable";
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
