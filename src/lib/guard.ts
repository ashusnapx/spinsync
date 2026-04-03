import { auth } from "./auth";
import { headers } from "next/headers";
import { errors } from "./api-response";

// ═══════════════════════════════════════════
// GUARD UTILITIES — AUTH + RBAC + ORG CHECKS
// ═══════════════════════════════════════════

export interface AuthContext {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  session: {
    id: string;
    userId: string;
  };
}

export interface OrgContext extends AuthContext {
  orgId: string;
  orgRole: string; // "pg_admin" | "premium_user" | "free_user" | "owner" | "member"
}

/**
 * Require authenticated user. Returns AuthContext or throws NextResponse error.
 */
export async function requireAuth(request: Request): Promise<AuthContext> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    throw errors.unauthorized();
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
    session: {
      id: session.session.id,
      userId: session.session.userId,
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

  // Get the active organization from the session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const activeOrg = session?.session
    ? (session.session as Record<string, unknown>).activeOrganizationId
    : null;

  if (!activeOrg) {
    throw errors.forbidden("No active organization. Please join a PG first.");
  }

  // Get the user's role in the organization
  const orgSession = await auth.api.getFullOrganization({
    headers: await headers(),
    query: { organizationId: activeOrg as string },
  });

  const member = orgSession?.members?.find(
    (m: { userId: string }) => m.userId === authCtx.user.id
  );

  if (!member) {
    throw errors.forbidden("You are not a member of this organization.");
  }

  return {
    ...authCtx,
    orgId: activeOrg as string,
    orgRole: (member as Record<string, unknown>).role as string,
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

  // "owner" always has access (this is the org creator / pg_admin)
  if (ctx.orgRole === "owner" || allowedRoles.includes(ctx.orgRole)) {
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
