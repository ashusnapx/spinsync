import { NextRequest } from "next/server";

import { success, successWithMeta, errors } from "@/lib/api-response";
import { requireRole, withGuard } from "@/lib/guard";
import { createTenantSchema } from "@/forms/dashboard/tenant.schema";
import { createTenantForOrg, listTenantsForOrg } from "@/lib/tenant-admin";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";

// ═══════════════════════════════════════════
// GET /api/tenants — List tenants for the owner PG
// POST /api/tenants — Create a tenant account for the owner PG
// ═══════════════════════════════════════════

export async function GET(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireRole(request, "pg_admin");
    const page = Math.max(
      1,
      parseInt(request.nextUrl.searchParams.get("page") || "1", 10)
    );
    const limit = Math.min(
      50,
      Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "5", 10))
    );
    const { tenants, total } = await listTenantsForOrg(ctx.orgId, {
      page,
      limit,
    });

    return successWithMeta(tenants, { page, limit, total });
  });
}

export async function POST(request: NextRequest) {
  return withGuard(async () => {
    const ctx = await requireRole(request, "pg_admin");
    const body = await request.json();
    const parsed = createTenantSchema.safeParse(body);

    if (!parsed.success) {
      return errors.validation("Invalid tenant payload", {
        fields: parsed.error.flatten(),
      });
    }

    const tenant = await createTenantForOrg(ctx.orgId, parsed.data);

    await audit({
      userId: ctx.user.id,
      action: "tenant.created",
      resource: "user_profile",
      resourceId: tenant.userId,
      metadata: {
        email: tenant.email,
        roomNumber: tenant.roomNumber,
        subscriptionStatus: tenant.subscriptionStatus,
      },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success(tenant, 201);
  });
}
