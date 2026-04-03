import { NextRequest } from "next/server";
import { db } from "@/db";
import { pgLocations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireOrganization, withGuard } from "@/lib/guard";

// ═══════════════════════════════════════════
// GET /api/pg — Fetch current organization details
// ═══════════════════════════════════════════

export async function GET(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireOrganization(request);

    const [pg] = await db
      .select()
      .from(pgLocations)
      .where(eq(pgLocations.orgId, ctx.orgId))
      .limit(1);

    if (!pg) {
      return errors.notFound("Organization details");
    }

    return success({
      id: pg.id,
      name: pg.name,
      code: pg.code,
      address: pg.address,
      machineCount: pg.machineCount,
      role: ctx.orgRole,
    });
  });
}
