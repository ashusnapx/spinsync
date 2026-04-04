import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { pgLocations, machines } from "@/db/schema";
import { success, errors } from "@/lib/api-response";
import { requireAuth } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";
import { generatePgCode } from "@/lib/pg-code";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// ═══════════════════════════════════════════
// POST /api/pg/create — Create a new PG (admin flow)
// ═══════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const authCtx = await requireAuth(request);
    const body = await request.json();
    const { name, address, latitude, longitude, machineCount = 0 } = body;

    // ── Validate input ──
    if (!name || !address || latitude == null || longitude == null) {
      return errors.validation("Missing required fields: name, address, latitude, longitude");
    }

    if (name.length < 3 || name.length > 100) {
      return errors.validation("PG name must be between 3 and 100 characters");
    }

    const count = Number(machineCount);
    if (isNaN(count) || count < 1 || count > 50) {
      return errors.validation("machineCount must be between 1 and 50");
    }

    const [existingPg] = await db
      .select()
      .from(pgLocations)
      .where(eq(pgLocations.orgId, authCtx.user.id))
      .limit(1);

    if (existingPg) {
      return errors.conflict("This admin already owns a PG");
    }

    // ── Generate unique PG code ──
    let pgCode = generatePgCode();

    // Retry collisions before failing hard.
    let codeAvailable = false;
    for (let i = 0; i < 10; i += 1) {
      const [existing] = await db
        .select()
        .from(pgLocations)
        .where(eq(pgLocations.code, pgCode))
        .limit(1);

      if (!existing) {
        codeAvailable = true;
        break;
      }

      pgCode = generatePgCode();
    }

    if (!codeAvailable) {
      return errors.internal("Failed to generate a unique PG code");
    }

    // ── Store PG location + Machines in Transaction ──
    const orgId = authCtx.user.id;

    const result = await db.transaction(async (tx) => {
      const [pgLoc] = await tx
        .insert(pgLocations)
        .values({
          name,
          code: pgCode,
          address,
          latitude,
          longitude,
          orgId,
          machineCount: count,
        })
        .returning();

      if (count > 0) {
        const machinesToInsert = Array.from({ length: count }, (_, i) => ({
          name: `Washer ${i + 1}`,
          type: "washing_machine" as const,
          status: "free" as const,
          orgId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await tx.insert(machines).values(machinesToInsert);
      }

      return pgLoc;
    });

    // ── Audit log ──
    await audit({
      userId: authCtx.user.id,
      action: "pg.created",
      resource: "pg_location",
      resourceId: result.id,
      metadata: { name, pgCode, address, machineCount: count },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success(
      {
        id: result.id,
        name: result.name,
        code: result.code,
        orgId,
        address: result.address,
        machineCount: count,
      },
      201
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[PG/CREATE] Error:", err);
    
    // Fallback: Clean up the orphaned Supabase Auth User if Postgres commit fails
    try {
      const authCtx = await requireAuth(request).catch(() => null);
      if (authCtx?.user?.id) {
        const adminClient = createSupabaseAdminClient();
        await adminClient.auth.admin.deleteUser(authCtx.user.id);
        console.log(`[PG/CREATE] Rolled back auth user: ${authCtx.user.id}`);
      }
    } catch (cleanupErr) {
      console.error("[PG/CREATE] Auth rollback failed:", cleanupErr);
    }
    
    return errors.internal();
  }
}
