import { NextRequest } from "next/server";
import { db } from "@/db";
import { machines, machineSessions } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { success, errors } from "@/lib/api-response";
import { requireOrganization, requireResourceAccess, withGuard } from "@/lib/guard";
import { audit, getIpAddress, getUserAgent } from "@/lib/logger";
import {
  isMachineStartLocationAllowed,
  isValidLatitude,
  isValidLongitude,
  MAX_MACHINE_GPS_ACCURACY_METERS,
  normalizeAccuracy,
  normalizeCoordinate,
} from "@/lib/machine-location";
import { recordVerification } from "@/lib/geo-server-utils";

// ═══════════════════════════════════════════
// POST /api/machines/[id]/stop — Stop using a machine
// Frees the machine immediately after a location-verified stop
// ═══════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withGuard(async () => {
    const { id: machineId } = await params;
    const ctx = await requireOrganization(request);
    const body = (await request.json().catch(() => null)) as
      | {
          latitude?: number | string;
          longitude?: number | string;
          accuracy?: number | string;
        }
      | null;

    // ── Find the current machine and active session ──
    const [machine] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, machineId))
      .limit(1);

    if (!machine) return errors.notFound("Machine");
    requireResourceAccess(ctx, machine.orgId);

    if (machine.status !== "occupied") {
      return errors.machineUnavailable("Machine is not currently in use");
    }

    if (ctx.orgRole !== "pg_admin") {
      const machineLatitude = machine.latitude;
      const machineLongitude = machine.longitude;

      if (
        machineLatitude === null ||
        machineLatitude === undefined ||
        machineLongitude === null ||
        machineLongitude === undefined ||
        !isValidLatitude(machineLatitude) ||
        !isValidLongitude(machineLongitude)
      ) {
        return errors.validation(
          "This machine does not have location coordinates configured yet"
        );
      }

      const latitude = normalizeCoordinate(body?.latitude);
      const longitude = normalizeCoordinate(body?.longitude);
      const accuracy = normalizeAccuracy(body?.accuracy);

      if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
        return errors.locationFailed(
          "Enable precise location access and try stopping the machine again"
        );
      }

      if (accuracy !== null && accuracy > MAX_MACHINE_GPS_ACCURACY_METERS) {
        await recordVerification(
          ctx.user.id,
          { latitude, longitude, accuracy },
          0,
          false
        );

        return errors.locationFailed(
          "Location accuracy is too low. Move closer to the machine and retry."
        );
      }

      const verification = isMachineStartLocationAllowed(
        { latitude, longitude, accuracy: accuracy ?? undefined },
        {
          latitude: machineLatitude,
          longitude: machineLongitude,
        }
      );

      await recordVerification(
        ctx.user.id,
        { latitude, longitude, accuracy: accuracy ?? undefined },
        verification.passed ? 1 : 0,
        verification.passed
      );

      if (!verification.passed) {
        return errors.locationFailed(
          `You must be near the machine to stop it. Current distance: ${Math.round(
            verification.distanceMeters
          )}m.`
        );
      }
    }

    // Get current session
    let activeSession =
      machine.currentSessionId
        ? (
            await db
              .select()
              .from(machineSessions)
              .where(eq(machineSessions.id, machine.currentSessionId))
              .limit(1)
          )[0] ?? null
        : null;

    if (!activeSession) {
      activeSession =
        (
          await db
            .select()
            .from(machineSessions)
            .where(
              and(
                eq(machineSessions.machineId, machineId),
                eq(machineSessions.orgId, ctx.orgId),
                isNull(machineSessions.endedAt)
              )
            )
            .orderBy(desc(machineSessions.startedAt))
            .limit(1)
        )[0] ?? null;
    }

    // ── End the session ──
    const now = new Date();
    let durationMinutes: number | null = null;
    if (activeSession) {
      durationMinutes = Math.round(
        (now.getTime() - new Date(activeSession.startedAt).getTime()) / 60000
      );

      await db
        .update(machineSessions)
        .set({
          endedAt: now,
          durationMinutes,
          graceStartedAt: null,
        })
        .where(eq(machineSessions.id, activeSession.id));
    }

    // ── Free the machine immediately ──
    await db
      .update(machines)
      .set({
        status: "free",
        currentSessionId: null,
        updatedAt: now,
      })
      .where(eq(machines.id, machineId));

    await audit({
      userId: ctx.user.id,
      action: "machine.stopped",
      resource: "machine",
      resourceId: machineId,
      metadata: {
        sessionId: activeSession?.id,
        stoppedByUserId: ctx.user.id,
        forceStoppedWithoutSession: !activeSession,
        sessionOwnerUserId: activeSession?.userId ?? null,
        durationMinutes,
      },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({
      status: "free",
      stoppedAt: now.toISOString(),
    });
  });
}
