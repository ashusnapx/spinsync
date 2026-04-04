import { NextRequest } from "next/server";

import { success, errors } from "@/lib/api-response";
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
    const tenants = await listTenantsForOrg(ctx.orgId);

    return success(tenants);
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
