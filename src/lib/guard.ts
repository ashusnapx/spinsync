import { createSupabaseServerClient } from "./supabase/server";
import { errors } from "./api-response";
import { db } from "@/db";
import { userProfiles, pgLocations } from "@/db/schema";
import { eq } from "drizzle-orm";

// ═══════════════════════════════════════════
// GUARD UTILITIES — AUTH + RBAC + ORG CHECKS
// ═══════════════════════════════════════════

export interface AuthContext {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface OrgContext extends AuthContext {
  orgId: string;
  orgRole: string; // "pg_admin" | "free_user" | "premium_user"
}

/**
 * Require authenticated user. Returns AuthContext or throws NextResponse error.
 */
export async function requireAuth(request: Request): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw errors.unauthorized();
  }

  return {
    user: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.email?.split('@')[0] || "User",
    },
  };
}

/**
 * Require authenticated user + active organization membership.
 * Returns OrgContext with orgId and role.
 */
export async function requireOrganization(
  request: Request
): Promise<OrgContext> {
  const authCtx = await requireAuth(request);

  // Check if user is a PG admin manually mapping their id as orgId from pg_create
  const [adminPg] = await db
    .select()
    .from(pgLocations)
    .where(eq(pgLocations.orgId, authCtx.user.id))
    .limit(1);

  if (adminPg) {
    return {
      ...authCtx,
      orgId: adminPg.orgId,
      orgRole: "pg_admin",
    };
  }

  // Get the active organization from userProfiles
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, authCtx.user.id))
    .limit(1);

  if (!profile) {
    throw errors.forbidden("No active organization. Please join a PG first.");
  }

  return {
    ...authCtx,
    orgId: profile.orgId,
    orgRole: profile.subscriptionStatus === "premium" ? "premium_user" : "free_user",
  };
}

/**
 * Require a specific role within the active organization.
 */
export async function requireRole(
  request: Request,
  ...allowedRoles: string[]
): Promise<OrgContext> {
  const ctx = await requireOrganization(request);

  // "pg_admin" always has maximal access
  if (ctx.orgRole === "pg_admin" || allowedRoles.includes(ctx.orgRole)) {
    return ctx;
  }

  throw errors.forbidden(
    `This action requires one of the following roles: ${allowedRoles.join(", ")}`
  );
}

/**
 * Ensure a resource belongs to the user's active organization.
 * Prevents cross-org data access.
 */
export function requireResourceAccess(
  ctx: OrgContext,
  resourceOrgId: string
): void {
  if (ctx.orgId !== resourceOrgId) {
    throw errors.forbidden("You cannot access resources from another organization.");
  }
}

/**
 * Helper: wrap an API handler with automatic auth error handling.
 * Guards throw NextResponse objects — this catches them and returns properly.
 */
export async function withGuard<T>(
  handler: () => Promise<T>
): Promise<T | Response> {
  try {
    return await handler();
  } catch (err) {
    // Guards throw NextResponse objects
    if (err instanceof Response) {
      return err;
    }
    // Re-throw unexpected errors
    throw err;
  }
}
