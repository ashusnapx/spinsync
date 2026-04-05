import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { machines, machineSessions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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
// POST /api/machines/[id]/start — Start using a machine
// Uses atomic DB-level locking to prevent race conditions
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
          cycleMinutes?: number | string;
        }
      | null;

    const [machine] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, machineId))
      .limit(1);

    if (!machine) return errors.notFound("Machine");
    requireResourceAccess(ctx, machine.orgId);

    const cycleMinutes = normalizeCycleMinutes(body?.cycleMinutes);

    if (cycleMinutes === null) {
      return errors.validation(
        "Enter the machine's displayed cycle time in minutes before starting"
      );
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
          "Enable precise location access and try starting the machine again"
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
          `You must be near the machine to start it. Current distance: ${Math.round(
            verification.distanceMeters
          )}m.`
        );
      }
    }

    // ── Atomic lock: only succeeds if machine is currently 'free' ──
    // This is the key race-condition prevention: the WHERE clause ensures
    // only ONE concurrent request can succeed
    const sessionId = randomUUID();
    const startedSession = await db.transaction(async (tx) => {
      const result = await tx.execute(sql`
        UPDATE machines 
        SET status = 'occupied', 
            current_session_id = ${sessionId}::uuid,
            updated_at = NOW()
        WHERE id = ${machineId} 
          AND status = 'free' 
          AND org_id = ${ctx.orgId}
        RETURNING *
      `);

      const updatedMachine = result.rows?.[0];

      if (!updatedMachine) {
        return null;
      }

      const [session] = await tx
        .insert(machineSessions)
        .values({
          id: sessionId,
          machineId,
          userId: ctx.user.id,
          orgId: ctx.orgId,
          heartbeatAt: new Date(),
        })
        .returning();

      return {
        machine: updatedMachine,
        session,
      };
    });

    if (!startedSession) {
      // Either machine doesn't exist, wrong org, or not free
      return errors.machineUnavailable(
        `Machine is currently ${machine.status.replace("_", " ")}`
      );
    }
    const reminderAt = new Date(startedSession.session.startedAt);
    reminderAt.setMinutes(reminderAt.getMinutes() + cycleMinutes + 30);

    await audit({
      userId: ctx.user.id,
      action: "machine.started",
      resource: "machine",
      resourceId: machineId,
      metadata: {
        sessionId: startedSession.session.id,
        cycleMinutes,
        bufferMinutes: 30,
        reminderAt: reminderAt.toISOString(),
      },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    });

    return success({
      machine: startedSession.machine,
      session: {
        id: startedSession.session.id,
        startedAt: startedSession.session.startedAt,
      },
      cycleMinutes,
      reminderAt: reminderAt.toISOString(),
      bufferMinutes: 30,
      machineName: machine.name,
    });
  });
}

function normalizeCycleMinutes(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
      ? Number(value)
      : NaN;

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const rounded = Math.round(parsed);

  if (rounded < 1 || rounded > 240) {
    return null;
  }

  return rounded;
}
