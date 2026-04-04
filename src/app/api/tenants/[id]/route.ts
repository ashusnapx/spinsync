import { NextRequest } from "next/server";

import { errors, success } from "@/lib/api-response";
import { requireRole, withGuard } from "@/lib/guard";
import { updateTenantSchema } from "@/forms/dashboard/tenant.schema";
import { deleteTenantForOrg, updateTenantForOrg } from "@/lib/tenant-admin";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";

// ═══════════════════════════════════════════
// PATCH /api/tenants/[id] — Update a tenant account
// DELETE /api/tenants/[id] — Remove a tenant account
// ═══════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withGuard(async () => {
    const ctx = await requireRole(request, "pg_admin");
    const { id } = await params;

    if (!id) {
      return errors.validation("Tenant ID is required");
    }

    const body = await request.json();
    const parsed = updateTenantSchema.safeParse(body);

    if (!parsed.success) {
      return errors.validation("Invalid tenant payload", {
        fields: parsed.error.flatten(),
      });
    }

    const tenant = await updateTenantForOrg(ctx.orgId, id, parsed.data);

    if (!tenant) {
      return errors.notFound("Tenant");
    }

    await audit({
      userId: ctx.user.id,
      action: "tenant.updated",
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

    return success(tenant);
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withGuard(async () => {
    const ctx = await requireRole(request, "pg_admin");
    const { id } = await params;

    if (!id) {
      return errors.validation("Tenant ID is required");
    }

    const result = await deleteTenantForOrg(ctx.orgId, id);

    if (!result) {
      return errors.notFound("Tenant");
    }

    await audit({
      userId: ctx.user.id,
      action: "tenant.deleted",
      resource: "user_profile",
      resourceId: result.userId,
      metadata: {
        authDeleted: result.authDeleted,
        authDeleteError: result.authDeleteError,
      },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success(result);
  });
}
