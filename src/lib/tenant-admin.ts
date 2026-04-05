import "server-only";

import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  achievements,
  deviceIdentities,
  locationVerifications,
  notifications,
  queueEntries,
  type SubscriptionStatus,
  userProfiles,
} from "@/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CreateTenantInput, UpdateTenantInput } from "@/forms/dashboard/tenant.schema";

export interface TenantRecord {
  userId: string;
  name: string;
  email: string;
  roomNumber: string;
  subscriptionStatus: SubscriptionStatus;
  joinedAt: Date;
  updatedAt: Date;
  lastSignInAt: string | null;
}

export interface TenantDeleteResult {
  userId: string;
  authDeleted: boolean;
  authDeleteError: string | null;
}

export interface TenantListPage {
  tenants: TenantRecord[];
  total: number;
}

interface AuthUserSnapshot {
  email: string;
  name: string;
  metadata: Record<string, unknown>;
  lastSignInAt: string | null;
}

export async function listTenantsForOrg(
  orgId: string,
  options?: { page?: number; limit?: number }
): Promise<TenantListPage> {
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(Math.max(1, options?.limit ?? 25), 50);
  const offset = (page - 1) * limit;

  const [totalResult] = await db
    .select({ count: count() })
    .from(userProfiles)
    .where(eq(userProfiles.orgId, orgId));

  const profiles = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.orgId, orgId))
    .orderBy(desc(userProfiles.createdAt))
    .limit(limit)
    .offset(offset);

  if (profiles.length === 0) {
    return {
      tenants: [],
      total: Number(totalResult?.count ?? 0),
    };
  }

  const authUsers = await Promise.all(
    profiles.map(async (profile) => {
      const authUser = await getAuthUserSnapshot(profile.userId);

      return [profile.userId, authUser] as const;
    })
  );

  const authUserMap = new Map(authUsers);

  return {
    tenants: profiles.map((profile) => {
      const authUser = authUserMap.get(profile.userId);

      return {
        userId: profile.userId,
        name: authUser?.name ?? "Unknown tenant",
        email: authUser?.email ?? "unavailable@example.com",
        roomNumber: profile.roomNumber,
        subscriptionStatus: profile.subscriptionStatus,
        joinedAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        lastSignInAt: authUser?.lastSignInAt ?? null,
      };
    }),
    total: Number(totalResult?.count ?? 0),
  };
}

export async function createTenantForOrg(
  orgId: string,
  input: CreateTenantInput
): Promise<TenantRecord> {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.name,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Failed to create tenant account");
  }

  try {
    const [profile] = await db
      .insert(userProfiles)
      .values({
        userId: data.user.id,
        roomNumber: input.roomNumber,
        orgId,
        subscriptionStatus: input.subscriptionStatus,
        points: 0,
        totalSessions: 0,
      })
      .returning();

    return {
      userId: profile.userId,
      name: input.name,
      email: input.email,
      roomNumber: profile.roomNumber,
      subscriptionStatus: profile.subscriptionStatus,
      joinedAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      lastSignInAt: data.user.last_sign_in_at ?? null,
    };
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    throw error;
  }
}

export async function updateTenantForOrg(
  orgId: string,
  userId: string,
  input: UpdateTenantInput
): Promise<TenantRecord | null> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(and(eq(userProfiles.orgId, orgId), eq(userProfiles.userId, userId)))
    .limit(1);

  if (!profile) {
    return null;
  }

  const currentAuthUser = await getAuthUserSnapshot(userId);

  if (!currentAuthUser) {
    throw new Error("Tenant account could not be found in authentication records");
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const authPayload: {
    email?: string;
    password?: string;
    user_metadata?: Record<string, unknown>;
  } = {};

  if (input.email !== currentAuthUser.email) {
    authPayload.email = input.email;
  }

  if (input.password) {
    authPayload.password = input.password;
  }

  if (input.name !== currentAuthUser.name) {
    authPayload.user_metadata = {
      ...currentAuthUser.metadata,
      name: input.name,
    };
  }

  let updatedAuthUser = currentAuthUser;

  if (Object.keys(authPayload).length > 0) {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      authPayload
    );

    if (error || !data.user) {
      throw new Error(error?.message ?? "Failed to update tenant account");
    }

    updatedAuthUser = {
      email: data.user.email ?? input.email,
      name: extractUserName(data.user.user_metadata, input.email),
      metadata: normalizeMetadata(data.user.user_metadata),
      lastSignInAt: data.user.last_sign_in_at ?? currentAuthUser.lastSignInAt,
    };
  }

  const [updatedProfile] = await db
    .update(userProfiles)
    .set({
      roomNumber: input.roomNumber,
      subscriptionStatus: input.subscriptionStatus,
      updatedAt: new Date(),
    })
    .where(and(eq(userProfiles.orgId, orgId), eq(userProfiles.userId, userId)))
    .returning();

  return {
    userId: updatedProfile.userId,
    name: updatedAuthUser.name,
    email: updatedAuthUser.email,
    roomNumber: updatedProfile.roomNumber,
    subscriptionStatus: updatedProfile.subscriptionStatus,
    joinedAt: updatedProfile.createdAt,
    updatedAt: updatedProfile.updatedAt,
    lastSignInAt: updatedAuthUser.lastSignInAt,
  };
}

export async function deleteTenantForOrg(
  orgId: string,
  userId: string
): Promise<TenantDeleteResult | null> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(and(eq(userProfiles.orgId, orgId), eq(userProfiles.userId, userId)))
    .limit(1);

  if (!profile) {
    return null;
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(queueEntries)
      .where(and(eq(queueEntries.orgId, orgId), eq(queueEntries.userId, userId)));
    await tx
      .delete(deviceIdentities)
      .where(eq(deviceIdentities.userId, userId));
    await tx
      .delete(locationVerifications)
      .where(eq(locationVerifications.userId, userId));
    await tx
      .delete(notifications)
      .where(eq(notifications.userId, userId));
    await tx
      .delete(achievements)
      .where(eq(achievements.userId, userId));
    await tx
      .delete(userProfiles)
      .where(eq(userProfiles.userId, userId));
  });

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  return {
    userId,
    authDeleted: !error,
    authDeleteError: error?.message ?? null,
  };
}

async function getAuthUserSnapshot(userId: string): Promise<AuthUserSnapshot | null> {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (error || !data.user) {
    return null;
  }

  return {
    email: data.user.email ?? "unknown@example.com",
    name: extractUserName(data.user.user_metadata, data.user.email ?? "Tenant"),
    metadata: normalizeMetadata(data.user.user_metadata),
    lastSignInAt: data.user.last_sign_in_at ?? null,
  };
}

function extractUserName(
  metadata: unknown,
  fallbackEmail: string
): string {
  const normalizedMetadata = normalizeMetadata(metadata);
  const candidate = normalizedMetadata.name;

  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate.trim();
  }

  return fallbackEmail.split("@")[0] || "Tenant";
}

function normalizeMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return metadata as Record<string, unknown>;
}
