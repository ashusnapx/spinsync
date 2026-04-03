import { NextRequest } from "next/server";
import { db } from "@/db";
import { pgLocations } from "@/db/schema";
import { success, errors } from "@/lib/api-response";
import { requireAuth } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { v4 as uuidv4 } from "uuid";

// ═══════════════════════════════════════════
// POST /api/pg/create — Create a new PG (admin flow)
// ═══════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const authCtx = await requireAuth(request);
    const body = await request.json();
    const { name, address, latitude, longitude } = body;

    // ── Validate input ──
    if (!name || !address || latitude == null || longitude == null) {
      return errors.validation("Missing required fields: name, address, latitude, longitude");
    }

    if (name.length < 3 || name.length > 100) {
      return errors.validation("PG name must be between 3 and 100 characters");
    }

    // ── Generate unique PG code ──
    const pgCode = generatePgCode(name);

    // ── Create Organization via better-auth ──
    const orgResult = await auth.api.createOrganization({
      headers: await headers(),
      body: {
        name: name,
        slug: pgCode.toLowerCase(),
      },
    });

    if (!orgResult) {
      return errors.internal("Failed to create organization");
    }

    const orgId = orgResult.id;

    // ── Store PG location ──
    const [pgLocation] = await db
      .insert(pgLocations)
      .values({
        name,
        code: pgCode,
        address,
        latitude,
        longitude,
        orgId,
      })
      .returning();

    // ── Audit log ──
    await audit({
      userId: authCtx.user.id,
      action: "pg.created",
      resource: "pg_location",
      resourceId: pgLocation.id,
      metadata: { name, pgCode, address, latitude, longitude },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success(
      {
        id: pgLocation.id,
        name: pgLocation.name,
        code: pgLocation.code,
        orgId,
        address: pgLocation.address,
      },
      201
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[PG/CREATE] Error:", err);
    return errors.internal();
  }
}

/**
 * Generate a unique 6-character PG code from the name.
 * Format: first 3 letters of name (uppercase) + 3 random digits
 */
function generatePgCode(name: string): string {
  const prefix = name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const suffix = Math.floor(100 + Math.random() * 900).toString();
  return `${prefix}${suffix}`;
}
