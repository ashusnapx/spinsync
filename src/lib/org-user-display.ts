import "server-only";

import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { userProfiles } from "@/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface CachedUserIdentity {
  name: string;
  expiresAt: number;
}

export interface OrgUserDisplay {
  name: string;
  roomNumber: string | null;
  isAdmin: boolean;
  chatLabel: string;
}

const USER_IDENTITY_CACHE_TTL_MS = 5 * 60 * 1000;
const userIdentityCache = new Map<string, CachedUserIdentity>();

export async function getOrgUserDisplayMap(
  orgId: string,
  userIds: string[]
): Promise<Map<string, OrgUserDisplay>> {
  const uniqueUserIds = Array.from(
    new Set(userIds.filter((userId) => typeof userId === "string" && userId.length > 0))
  );

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const profiles = await db
    .select({
      userId: userProfiles.userId,
      roomNumber: userProfiles.roomNumber,
    })
    .from(userProfiles)
    .where(inArray(userProfiles.userId, uniqueUserIds));

  const roomNumberByUserId = new Map(
    profiles.map((profile) => [profile.userId, profile.roomNumber])
  );

  const authNamesByUserId = await getAuthNames(uniqueUserIds);

  return new Map(
    uniqueUserIds.map((userId) => {
      const isAdmin = userId === orgId;
      const name = authNamesByUserId.get(userId) ?? (isAdmin ? "Admin" : "Resident");
      const roomNumber = isAdmin ? null : roomNumberByUserId.get(userId) ?? null;

      return [
        userId,
        {
          name,
          roomNumber,
          isAdmin,
          chatLabel: isAdmin
            ? `${name} (admin)`
            : roomNumber
            ? `${name} (${roomNumber})`
            : name,
        },
      ] satisfies [string, OrgUserDisplay];
    })
  );
}

async function getAuthNames(userIds: string[]) {
  const now = Date.now();
  const authNames = new Map<string, string>();
  const missingUserIds: string[] = [];

  for (const userId of userIds) {
    const cachedEntry = userIdentityCache.get(userId);

    if (cachedEntry && cachedEntry.expiresAt > now) {
      authNames.set(userId, cachedEntry.name);
      continue;
    }

    missingUserIds.push(userId);
  }

  if (missingUserIds.length === 0) {
    return authNames;
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const fetchedEntries = await Promise.all(
    missingUserIds.map(async (userId) => {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (error || !data.user) {
        return [userId, null] as const;
      }

      const metadata = data.user.user_metadata;
      const metadataName =
        metadata && typeof metadata === "object" && "name" in metadata
          ? metadata.name
          : null;
      const resolvedName =
        typeof metadataName === "string" && metadataName.trim().length > 0
          ? metadataName.trim()
          : data.user.email?.split("@")[0] ?? "Resident";

      userIdentityCache.set(userId, {
        name: resolvedName,
        expiresAt: now + USER_IDENTITY_CACHE_TTL_MS,
      });

      return [userId, resolvedName] as const;
    })
  );

  for (const [userId, name] of fetchedEntries) {
    if (name) {
      authNames.set(userId, name);
    }
  }

  return authNames;
}
