import { NextResponse } from "next/server";

// ═══════════════════════════════════════════
// STANDARDIZED API RESPONSE SYSTEM
// ═══════════════════════════════════════════

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// ── Success Response ──
export function success<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

// ── Success with pagination meta ──
export function successWithMeta<T>(
  data: T,
  meta: { page: number; limit: number; total: number },
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, meta }, { status });
}

// ── Error Response ──
export function error(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { success: false, error: { code, message, details } },
    { status }
  );
}

// ── Common Error Helpers ──
export const errors = {
  unauthorized: (message = "Authentication required") =>
    error("UNAUTHORIZED", message, 401),

  forbidden: (message = "You do not have permission to perform this action") =>
    error("FORBIDDEN", message, 403),

  notFound: (resource = "Resource") =>
    error("NOT_FOUND", `${resource} not found`, 404),

  conflict: (message: string) =>
    error("CONFLICT", message, 409),

  validation: (message: string, details?: Record<string, unknown>) =>
    error("VALIDATION_ERROR", message, 422, details),

  rateLimited: (message = "Too many requests. Please try again later.") =>
    error("RATE_LIMITED", message, 429),

  internal: (message = "An unexpected error occurred") =>
    error("INTERNAL_ERROR", message, 500),

  machineUnavailable: (message = "This machine is not available") =>
    error("MACHINE_UNAVAILABLE", message, 409),

  locationFailed: (message = "Location verification failed") =>
    error("LOCATION_VERIFICATION_FAILED", message, 403),

  deviceUntrusted: (message = "Device identity could not be verified") =>
    error("DEVICE_UNTRUSTED", message, 403),

  subscriptionRequired: (message = "Premium subscription required") =>
    error("SUBSCRIPTION_REQUIRED", message, 402),
};
