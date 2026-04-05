"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  Loader2,
  LocateFixed,
  Pencil,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  StopCircle,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { MachineCard, type MachineCardAction, type MachineCardStatus } from "@/components/ui/MachineCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAppleCalendarDataUrl, buildGoogleCalendarUrl } from "@/lib/calendar";
import { formatMachineCoordinates } from "@/lib/machine-location";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboard-store";

type MachineType = "washing_machine" | "dryer" | "iron" | "dishwasher";

interface MachineSessionSummary {
  id: string;
  machineId: string;
  userId: string;
  userName: string | null;
  startedAt: string;
}

interface MachineRecord {
  id: string;
  name: string;
  type: MachineType;
  status: MachineCardStatus;
  orgId: string;
  floor: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  qrSecret: string | null;
  currentSessionId: string | null;
  currentSession: MachineSessionSummary | null;
  createdAt: string;
  updatedAt: string;
}

interface MachineFormState {
  name: string;
  type: MachineType;
  floor: string;
  latitude: string;
  longitude: string;
}

const EMPTY_MACHINE_FORM: MachineFormState = {
  name: "",
  type: "washing_machine",
  floor: "",
  latitude: "",
  longitude: "",
};

interface ReminderDialogState {
  machineName: string;
  reminderAt: string;
  cycleMinutes: number;
  googleCalendarUrl: string;
  appleCalendarUrl: string;
}

interface MachineMutationPayload {
  data?: Record<string, unknown>;
}

interface MachineStartMutationData {
  reminderAt?: string;
  machineName?: string;
  session?: {
    startedAt?: string;
  };
}

const MACHINE_CACHE_TTL_MS = 30000;
let machinesCache:
  | {
      data: MachineRecord[];
      expiresAt: number;
    }
  | null = null;
let inFlightMachinesRequest: Promise<MachineRecord[]> | null = null;

function clearMachinesCache() {
  machinesCache = null;
  inFlightMachinesRequest = null;
}

export default function MachinesPage() {
  const pgData = useDashboardStore((state) => state.pgData);
  const pgStatus = useDashboardStore((state) => state.status);
  const fetchPgData = useDashboardStore((state) => state.fetchPgData);
  const updatePgData = useDashboardStore((state) => state.updatePgData);
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyMachineId, setBusyMachineId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingMachine, setEditingMachine] = useState<MachineRecord | null>(null);
  const [formState, setFormState] = useState<MachineFormState>(EMPTY_MACHINE_FORM);
  const [formError, setFormError] = useState("");
  const [isSavingMachine, setIsSavingMachine] = useState(false);
  const [isCapturingCoordinates, setIsCapturingCoordinates] = useState(false);
  const [coordinateHint, setCoordinateHint] = useState("");
  const [hasRequestedAutofill, setHasRequestedAutofill] = useState(false);
  const [startMachineTarget, setStartMachineTarget] = useState<MachineRecord | null>(null);
  const [displayedCycleMinutes, setDisplayedCycleMinutes] = useState("45");
  const [startMachineError, setStartMachineError] = useState("");
  const [reminderDialog, setReminderDialog] = useState<ReminderDialogState | null>(
    null
  );
  const [qrState, setQrState] = useState<{
    machine: MachineRecord | null;
    qrDataUrl: string;
    expiresAt: string;
    isLoading: boolean;
    error: string;
  }>({
    machine: null,
    qrDataUrl: "",
    expiresAt: "",
    isLoading: false,
    error: "",
  });

  useEffect(() => {
    if (!pgData && pgStatus === "idle") {
      void fetchPgData();
    }
  }, [fetchPgData, pgData, pgStatus]);

  const fetchMachines = useCallback(async ({
    showSpinner = true,
    force = false,
  }: {
    showSpinner?: boolean;
    force?: boolean;
  } = {}) => {
    if (showSpinner) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      if (!force && machinesCache && machinesCache.expiresAt > Date.now()) {
        setMachines(sortMachines(machinesCache.data));
        return;
      }

      if (!force && inFlightMachinesRequest) {
        setMachines(sortMachines(await inFlightMachinesRequest));
        return;
      }

      inFlightMachinesRequest = fetch("/api/machines", {
        credentials: "include",
        cache: "no-store",
      })
        .then(async (response) => {
          const payload = await response.json();

          if (!response.ok || !payload.success) {
            throw new Error(payload.error?.message ?? "Failed to load machines");
          }

          const nextMachines = payload.data as MachineRecord[];
          machinesCache = {
            data: nextMachines,
            expiresAt: Date.now() + MACHINE_CACHE_TTL_MS,
          };

          return nextMachines;
        })
        .finally(() => {
          inFlightMachinesRequest = null;
        });

      setMachines(sortMachines(await inFlightMachinesRequest));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load machines";
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchMachines();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        return;
      }

      if (machinesCache && machinesCache.expiresAt > Date.now()) {
        return;
      }

      void fetchMachines({ showSpinner: false });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchMachines]);

  const isAdmin = pgData?.role === "pg_admin";

  const filteredMachines = useMemo(
    () => ({
      all: machines,
      available: machines.filter((machine) => machine.status === "free"),
      active: machines.filter((machine) =>
        ["occupied", "locked"].includes(machine.status)
      ),
      attention: machines.filter((machine) =>
        ["maintenance", "out_of_order", "locked"].includes(machine.status)
      ),
    }),
    [machines]
  );

  const handleStartMachine = (machine: MachineRecord) => {
    setStartMachineTarget(machine);
    setDisplayedCycleMinutes("45");
    setStartMachineError("");
  };

  const handleStopMachine = async (machineId: string) => {
    try {
      const currentLocation = await getBrowserCoordinates();

      await runMachineMutation({
        machineId,
        request: () =>
          fetch(`/api/machines/${machineId}/stop`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(currentLocation),
          }),
        successMessage: "Machine marked available",
        successDescription: "Cycle closed and the machine is ready for the next use.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to verify your location";
      toast.error(message);
    }
  };

  const handleUpdateStatus = async (
    machineId: string,
    status: "free" | "maintenance" | "out_of_order"
  ) => {
    await runMachineMutation({
      machineId,
      request: () =>
        fetch(`/api/machines/${machineId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }),
      successMessage:
        status === "free"
          ? "Machine marked available"
          : status === "maintenance"
          ? "Machine moved to maintenance"
          : "Machine marked out of order",
    });
  };

  const handleDeleteMachine = async (machineId: string) => {
    if (!window.confirm("Delete this machine permanently?")) {
      return;
    }

    await runMachineMutation({
      machineId,
      request: () =>
        fetch(`/api/machines/${machineId}`, {
          method: "DELETE",
        }),
      successMessage: "Machine deleted",
      onSuccess: () => {
        clearMachinesCache();
        setMachines((currentMachines) =>
          currentMachines.filter((machine) => machine.id !== machineId)
        );
        updatePgData((currentPgData) =>
          currentPgData
            ? {
                ...currentPgData,
                machineCount: Math.max(currentPgData.machineCount - 1, 0),
              }
            : currentPgData
        );
      },
      skipRefresh: true,
    });
  };

  const handleConfirmStartMachine = async () => {
    if (!startMachineTarget) {
      return;
    }

    const cycleMinutes = Number(displayedCycleMinutes);

    if (!Number.isFinite(cycleMinutes) || cycleMinutes < 1 || cycleMinutes > 240) {
      setStartMachineError("Enter the machine's displayed time between 1 and 240 minutes.");
      return;
    }

    setStartMachineError("");

    try {
      const currentLocation = await getBrowserCoordinates();

      await runMachineMutation({
        machineId: startMachineTarget.id,
        request: () =>
          fetch(`/api/machines/${startMachineTarget.id}/start`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...currentLocation,
              cycleMinutes,
            }),
          }),
        successMessage: "Machine started",
        successDescription:
          "Session is live. Add the pickup reminder to your calendar before leaving.",
        onSuccess: (payload) => {
          const startPayload = payload.data as MachineStartMutationData | undefined;
          const reminderAt = String(startPayload?.reminderAt ?? "");
          const machineName = String(
            startPayload?.machineName ?? startMachineTarget.name
          );
          const startedAt = String(
            startPayload?.session?.startedAt ?? new Date().toISOString()
          );
          const reminderDescription = `Machine displayed ${cycleMinutes} minutes. DhobiQ added a 30 minute pickup buffer.`;
          const reminderEndAt = new Date(reminderAt);
          reminderEndAt.setMinutes(reminderEndAt.getMinutes() + 10);

          setReminderDialog({
            machineName,
            reminderAt,
            cycleMinutes,
            googleCalendarUrl: buildGoogleCalendarUrl({
              title: `Collect clothes from ${machineName}`,
              description: reminderDescription,
              startAt: reminderAt,
              endAt: reminderEndAt.toISOString(),
              location: formatMachineCoordinates(
                startMachineTarget.latitude,
                startMachineTarget.longitude
              ),
            }),
            appleCalendarUrl: buildAppleCalendarDataUrl({
              title: `Collect clothes from ${machineName}`,
              description: `${reminderDescription}\nStarted at ${formatDateTime(
                startedAt
              )}.`,
              startAt: reminderAt,
              endAt: reminderEndAt.toISOString(),
              location: formatMachineCoordinates(
                startMachineTarget.latitude,
                startMachineTarget.longitude
              ),
            }),
          });
          setStartMachineTarget(null);
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to verify your location";
      setStartMachineError(message);
    }
  };

  const handleShowQr = async (machine: MachineRecord) => {
    setQrState({
      machine,
      qrDataUrl: "",
      expiresAt: "",
      isLoading: true,
      error: "",
    });

    try {
      const response = await fetch(`/api/machines/${machine.id}/qr`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Failed to generate QR code");
      }

      setQrState({
        machine,
        qrDataUrl: payload.data.qrDataUrl,
        expiresAt: payload.data.expiresAt,
        isLoading: false,
        error: "",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate QR code";
      setQrState({
        machine,
        qrDataUrl: "",
        expiresAt: "",
        isLoading: false,
        error: message,
      });
      toast.error(message);
    }
  };

  const openCreateDialog = () => {
    setFormMode("create");
    setEditingMachine(null);
    setFormState({
      ...EMPTY_MACHINE_FORM,
      name: `Washer ${machines.length + 1}`,
    });
    setFormError("");
    setCoordinateHint("");
    setHasRequestedAutofill(false);
    setIsFormOpen(true);
  };

  const openEditDialog = (machine: MachineRecord) => {
    setFormMode("edit");
    setEditingMachine(machine);
    setFormState({
      name: machine.name,
      type: machine.type,
      floor: machine.floor ?? "",
      latitude:
        typeof machine.latitude === "number" ? String(machine.latitude) : "",
      longitude:
        typeof machine.longitude === "number" ? String(machine.longitude) : "",
    });
    setFormError("");
    setCoordinateHint(
      machine.latitude !== null && machine.longitude !== null
        ? "Stored machine coordinates loaded."
        : ""
    );
    setHasRequestedAutofill(false);
    setIsFormOpen(true);
  };

  const closeFormDialog = () => {
    setIsFormOpen(false);
    setFormError("");
    setEditingMachine(null);
    setFormState(EMPTY_MACHINE_FORM);
    setCoordinateHint("");
    setHasRequestedAutofill(false);
  };

  const captureCoordinatesForForm = useCallback(async () => {
    setIsCapturingCoordinates(true);
    setCoordinateHint("");

    try {
      const currentLocation = await getBrowserCoordinates();
      setFormState((current) => ({
        ...current,
        latitude: String(currentLocation.latitude),
        longitude: String(currentLocation.longitude),
      }));
      setCoordinateHint(
        `Auto-filled from your device at ${formatDateTime(
          new Date().toISOString()
        )}`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to fetch location";
      setCoordinateHint(message);
      setFormError(message);
    } finally {
      setIsCapturingCoordinates(false);
      setHasRequestedAutofill(true);
    }
  }, []);

  useEffect(() => {
    if (!isFormOpen || hasRequestedAutofill) {
      return;
    }

    if (formState.latitude.trim() && formState.longitude.trim()) {
      setHasRequestedAutofill(true);
      return;
    }

    void captureCoordinatesForForm();
  }, [
    captureCoordinatesForForm,
    formState.latitude,
    formState.longitude,
    hasRequestedAutofill,
    isFormOpen,
  ]);

  const handleSaveMachine = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const name = formState.name.trim();
    if (!name) {
      setFormError("Machine name is required.");
      return;
    }

    if (!formState.latitude.trim() || !formState.longitude.trim()) {
      setFormError("Machine latitude and longitude are required.");
      return;
    }

    setIsSavingMachine(true);

    try {
      const payload = {
        name,
        type: formState.type,
        floor: formState.floor.trim() || null,
        latitude: formState.latitude.trim(),
        longitude: formState.longitude.trim(),
      };

      const response = await fetch(
        formMode === "create"
          ? "/api/machines"
          : `/api/machines/${editingMachine?.id ?? ""}`,
        {
          method: formMode === "create" ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      const body = await response.json();

      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Failed to save machine");
      }

      if (formMode === "create") {
        clearMachinesCache();
        updatePgData((currentPgData) =>
          currentPgData
            ? {
                ...currentPgData,
                machineCount: currentPgData.machineCount + 1,
              }
            : currentPgData
        );
        await fetchMachines({ showSpinner: false, force: true });
        toast.success("Machine created");
      } else {
        clearMachinesCache();
        await fetchMachines({ showSpinner: false, force: true });
        toast.success("Machine updated");
      }

      closeFormDialog();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save machine";
      setFormError(message);
    } finally {
      setIsSavingMachine(false);
    }
  };

  const runMachineMutation = async ({
    machineId,
    request,
    successMessage,
    successDescription,
    onSuccess,
    skipRefresh = false,
  }: {
    machineId: string;
    request: () => Promise<Response>;
    successMessage: string;
    successDescription?: string;
    onSuccess?: (payload: MachineMutationPayload) => void;
    skipRefresh?: boolean;
  }) => {
    setBusyMachineId(machineId);

    try {
      const response = await request();
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Request failed");
      }

      clearMachinesCache();
      onSuccess?.(payload as MachineMutationPayload);

      if (!skipRefresh) {
        await fetchMachines({ showSpinner: false, force: true });
      }

      toast.success(successMessage, {
        description: successDescription,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Request failed";
      toast.error(message);
    } finally {
      setBusyMachineId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Machine Operations</h1>
          <p className="mt-1 text-muted-foreground">
            {isAdmin
              ? "Manage coordinates, QR access, and live machine status without the old grace-period flow."
              : "Start and stop machines only when you are physically near them, then save the pickup reminder to your calendar."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchMachines({ showSpinner: false, force: true })}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="size-4" />
              Add Machine
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({filteredMachines.all.length})</TabsTrigger>
          <TabsTrigger value="available">
            Available ({filteredMachines.available.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({filteredMachines.active.length})
          </TabsTrigger>
          <TabsTrigger value="attention">
            Attention ({filteredMachines.attention.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <MachineGrid
            machines={filteredMachines.all}
            isAdmin={isAdmin}
            busyMachineId={busyMachineId}
            onStart={handleStartMachine}
            onStop={handleStopMachine}
            onEdit={openEditDialog}
            onDelete={handleDeleteMachine}
            onStatusChange={handleUpdateStatus}
            onShowQr={handleShowQr}
          />
        </TabsContent>

        <TabsContent value="available" className="mt-6">
          <MachineGrid
            machines={filteredMachines.available}
            isAdmin={isAdmin}
            busyMachineId={busyMachineId}
            onStart={handleStartMachine}
            onStop={handleStopMachine}
            onEdit={openEditDialog}
            onDelete={handleDeleteMachine}
            onStatusChange={handleUpdateStatus}
            onShowQr={handleShowQr}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          <MachineGrid
            machines={filteredMachines.active}
            isAdmin={isAdmin}
            busyMachineId={busyMachineId}
            onStart={handleStartMachine}
            onStop={handleStopMachine}
            onEdit={openEditDialog}
            onDelete={handleDeleteMachine}
            onStatusChange={handleUpdateStatus}
            onShowQr={handleShowQr}
          />
        </TabsContent>

        <TabsContent value="attention" className="mt-6">
          <MachineGrid
            machines={filteredMachines.attention}
            isAdmin={isAdmin}
            busyMachineId={busyMachineId}
            onStart={handleStartMachine}
            onStop={handleStopMachine}
            onEdit={openEditDialog}
            onDelete={handleDeleteMachine}
            onStatusChange={handleUpdateStatus}
            onShowQr={handleShowQr}
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(startMachineTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStartMachineTarget(null);
            setStartMachineError("");
          }
        }}
      >
        <DialogContent className="max-w-lg border border-white/10 bg-[#11131a] text-white">
          <DialogHeader>
            <DialogTitle>
              {startMachineTarget
                ? `Start ${startMachineTarget.name}`
                : "Start machine"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Enter the time currently shown on the machine. DhobiQ will add a
              30 minute pickup buffer and give you calendar links instead of
              in-app alerts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="text-sm font-medium text-white">
                Machine display time
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="machine-cycle-minutes">Minutes shown</Label>
                  <Input
                    id="machine-cycle-minutes"
                    inputMode="numeric"
                    value={displayedCycleMinutes}
                    onChange={(event) => setDisplayedCycleMinutes(event.target.value)}
                    placeholder="45"
                  />
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                  Pickup reminder = machine time + 30 mins
                </div>
              </div>

              {startMachineTarget ? (
                <div className="mt-4 text-sm text-white/50">
                  Coordinates:{" "}
                  {formatMachineCoordinates(
                    startMachineTarget.latitude,
                    startMachineTarget.longitude
                  )}
                </div>
              ) : null}
            </div>

            {startMachineError ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {startMachineError}
              </div>
            ) : null}
          </div>

          <DialogFooter className="-mx-0 -mb-0 rounded-xl border-0 bg-transparent p-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStartMachineTarget(null);
                setStartMachineError("");
              }}
              disabled={busyMachineId === startMachineTarget?.id}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmStartMachine()}
              disabled={busyMachineId === startMachineTarget?.id}
            >
              {busyMachineId === startMachineTarget?.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Start machine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeFormDialog();
          } else {
            setIsFormOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-xl border border-white/10 bg-[#11131a] text-white">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Add machine" : "Edit machine"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Capture the machine name, type, and exact coordinates. Residents
              must be near these coordinates before they can start the machine.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSaveMachine}>
            <div className="space-y-2">
              <Label htmlFor="machine-name">Machine name</Label>
              <Input
                id="machine-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Washer 1"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="machine-type">Machine type</Label>
                <select
                  id="machine-type"
                  value={formState.type}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      type: event.target.value as MachineType,
                    }))
                  }
                  className="input h-10"
                >
                  <option value="washing_machine">Washing Machine</option>
                  <option value="dryer">Dryer</option>
                  <option value="iron">Iron</option>
                  <option value="dishwasher">Dishwasher</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="machine-floor">Floor</Label>
                <Input
                  id="machine-floor"
                  value={formState.floor}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      floor: event.target.value,
                    }))
                  }
                  placeholder="Ground floor"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-medium text-white">
                    Machine coordinates
                  </div>
                  <div className="mt-1 text-sm text-white/50">
                    Auto-fill the latitude and longitude from the machine&apos;s
                    current position.
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void captureCoordinatesForForm()}
                  disabled={isCapturingCoordinates}
                >
                  {isCapturingCoordinates ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LocateFixed className="size-4" />
                  )}
                  Refresh coordinates
                </Button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="machine-latitude">Latitude</Label>
                  <Input
                    id="machine-latitude"
                    value={formState.latitude}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        latitude: event.target.value,
                      }))
                    }
                    placeholder="18.52043"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="machine-longitude">Longitude</Label>
                  <Input
                    id="machine-longitude"
                    value={formState.longitude}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        longitude: event.target.value,
                      }))
                    }
                    placeholder="73.85674"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/55">
                {coordinateHint ||
                  `Current entry: ${formatMachineCoordinates(
                    formState.latitude.trim() ? Number(formState.latitude) : null,
                    formState.longitude.trim() ? Number(formState.longitude) : null
                  )}`}
              </div>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {formError}
              </div>
            )}

            <DialogFooter className="-mx-0 -mb-0 rounded-xl border-0 bg-transparent p-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeFormDialog}
                disabled={isSavingMachine}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingMachine}>
                {isSavingMachine ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : formMode === "create" ? (
                  <Plus className="size-4" />
                ) : (
                  <Pencil className="size-4" />
                )}
                {formMode === "create" ? "Create machine" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reminderDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setReminderDialog(null);
          }
        }}
      >
        <DialogContent className="max-w-lg border border-white/10 bg-[#11131a] text-white">
          <DialogHeader>
            <DialogTitle>Pickup reminder ready</DialogTitle>
            <DialogDescription className="text-white/60">
              Add this to your calendar now so Google Calendar or Apple Calendar
              can remind you when it is time to collect your clothes.
            </DialogDescription>
          </DialogHeader>

          {reminderDialog ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Reminder
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {reminderDialog.machineName}
                </div>
                <div className="mt-1 text-sm text-white/55">
                  Machine time {reminderDialog.cycleMinutes} mins + 30 mins buffer
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-primary">
                  <CalendarClock className="size-4" />
                  Collect clothes at {formatDateTime(reminderDialog.reminderAt)}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href={reminderDialog.googleCalendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "default" }), "w-full")}
                >
                  <ExternalLink className="size-4" />
                  Google Calendar
                </a>
                <a
                  href={reminderDialog.appleCalendarUrl}
                  download={`${slugify(reminderDialog.machineName)}-pickup-reminder.ics`}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  <CalendarClock className="size-4" />
                  Apple/iPhone Calendar
                </a>
              </div>
            </div>
          ) : null}

          <DialogFooter className="-mx-0 -mb-0 rounded-xl border-0 bg-transparent p-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReminderDialog(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(qrState.machine)}
        onOpenChange={(open) => {
          if (!open) {
            setQrState({
              machine: null,
              qrDataUrl: "",
              expiresAt: "",
              isLoading: false,
              error: "",
            });
          }
        }}
      >
        <DialogContent className="max-w-md border border-white/10 bg-[#11131a] text-white">
          <DialogHeader>
            <DialogTitle>
              {qrState.machine ? `${qrState.machine.name} QR Access` : "Machine QR"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Generate the current rotating QR code for this machine and share it
              only where residents can scan it physically.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/15 px-6 py-8">
            {qrState.isLoading ? (
              <Loader2 className="size-8 animate-spin text-primary" />
            ) : qrState.qrDataUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrState.qrDataUrl}
                  alt={`${qrState.machine?.name ?? "Machine"} QR code`}
                  className="h-64 w-64 rounded-2xl border border-white/10 bg-black p-3"
                />
                <p className="text-sm text-white/55">
                  Expires at {formatDateTime(qrState.expiresAt)}
                </p>
              </>
            ) : (
              <p className="text-sm text-rose-300">
                {qrState.error || "Unable to generate QR code."}
              </p>
            )}
          </div>

          <DialogFooter className="-mx-0 -mb-0 rounded-xl border-0 bg-transparent p-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setQrState({
                  machine: null,
                  qrDataUrl: "",
                  expiresAt: "",
                  isLoading: false,
                  error: "",
                })
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MachineGrid({
  machines,
  isAdmin,
  busyMachineId,
  onStart,
  onStop,
  onEdit,
  onDelete,
  onStatusChange,
  onShowQr,
}: {
  machines: MachineRecord[];
  isAdmin: boolean;
  busyMachineId: string | null;
  onStart: (machine: MachineRecord) => void;
  onStop: (machineId: string) => void;
  onEdit: (machine: MachineRecord) => void;
  onDelete: (machineId: string) => void;
  onStatusChange: (
    machineId: string,
    status: "free" | "maintenance" | "out_of_order"
  ) => void;
  onShowQr: (machine: MachineRecord) => void;
}) {
  if (machines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-6 py-14 text-center text-white/55">
        No machines in this view.
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
    >
      {machines.map((machine) => (
        <motion.div key={machine.id} variants={fadeUp}>
          <MachineCard
            id={machine.id}
            name={machine.name}
            type={machine.type}
            status={machine.status}
            floor={machine.floor}
            latitude={machine.latitude}
            longitude={machine.longitude}
            currentSessionUserName={machine.currentSession?.userName ?? null}
            currentSessionStartedAt={machine.currentSession?.startedAt ?? null}
            primaryAction={getPrimaryAction({
              machine,
              isAdmin,
              busyMachineId,
              onStart,
              onStop,
              onStatusChange,
            })}
            secondaryAction={
              isAdmin
                ? {
                    label: "Show QR",
                    icon: QrCode,
                    variant: "outline",
                    disabled: busyMachineId === machine.id,
                    onClick: () => onShowQr(machine),
                  }
                : null
            }
            adminActions={
              isAdmin
                ? getAdminActions({
                    machine,
                    busyMachineId,
                    onEdit,
                    onDelete,
                    onStatusChange,
                  })
                : []
            }
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

function getPrimaryAction({
  machine,
  isAdmin,
  busyMachineId,
  onStart,
  onStop,
  onStatusChange,
}: {
  machine: MachineRecord;
  isAdmin: boolean;
  busyMachineId: string | null;
  onStart: (machine: MachineRecord) => void;
  onStop: (machineId: string) => void;
  onStatusChange: (
    machineId: string,
    status: "free" | "maintenance" | "out_of_order"
  ) => void;
}): MachineCardAction | null {
  const disabled = busyMachineId === machine.id;

  switch (machine.status) {
    case "free":
      return {
        label: "Start Machine",
        icon: Play,
        disabled,
        onClick: () => onStart(machine),
      };
    case "occupied":
      return {
        label: isAdmin ? "Stop Cycle" : "Stop Nearby Cycle",
        icon: StopCircle,
        disabled,
        onClick: () => onStop(machine.id),
      };
    case "grace_period":
      return isAdmin
        ? {
            label: "Clear Legacy State",
            icon: RotateCcw,
            disabled,
            onClick: () => onStatusChange(machine.id, "free"),
          }
        : {
            label: "Reset In Progress",
            icon: AlertTriangle,
            variant: "secondary",
            disabled: true,
            onClick: () => undefined,
          };
    case "locked":
      return isAdmin
        ? {
            label: "Unlock to Free",
            icon: RotateCcw,
            disabled,
            onClick: () => onStatusChange(machine.id, "free"),
          }
        : {
            label: "Locked",
            icon: AlertTriangle,
            variant: "secondary",
            disabled: true,
            onClick: () => undefined,
          };
    case "maintenance":
    case "out_of_order":
      return isAdmin
        ? {
            label: "Mark Available",
            icon: RotateCcw,
            disabled,
            onClick: () => onStatusChange(machine.id, "free"),
          }
        : {
            label: "Unavailable",
            icon: AlertTriangle,
            variant: "secondary",
            disabled: true,
            onClick: () => undefined,
          };
    default:
      return null;
  }
}

function getAdminActions({
  machine,
  busyMachineId,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  machine: MachineRecord;
  busyMachineId: string | null;
  onEdit: (machine: MachineRecord) => void;
  onDelete: (machineId: string) => void;
  onStatusChange: (
    machineId: string,
    status: "free" | "maintenance" | "out_of_order"
  ) => void;
}): MachineCardAction[] {
  const disabled = busyMachineId === machine.id;
  const actions: MachineCardAction[] = [
    {
      label: "Edit",
      icon: Pencil,
      variant: "outline",
      disabled,
      onClick: () => onEdit(machine),
    },
  ];

  if (machine.status !== "maintenance") {
    actions.push({
      label: "Maintenance",
      icon: Wrench,
      variant: "outline",
      disabled,
      onClick: () => onStatusChange(machine.id, "maintenance"),
    });
  }

  if (machine.status !== "out_of_order") {
    actions.push({
      label: "Out of Order",
      icon: AlertTriangle,
      variant: "outline",
      disabled,
      onClick: () => onStatusChange(machine.id, "out_of_order"),
    });
  }

  actions.push({
    label: "Delete",
    icon: Trash2,
    variant: "destructive",
    disabled,
    onClick: () => onDelete(machine.id),
  });

  return actions;
}

function sortMachines(machines: MachineRecord[]) {
  return [...machines].sort((left, right) => left.name.localeCompare(right.name));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

async function getBrowserCoordinates() {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    throw new Error("Geolocation is not available in this browser");
  }

  return new Promise<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
  }>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy:
            typeof position.coords.accuracy === "number"
              ? position.coords.accuracy
              : null,
        });
      },
      (error) => {
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? "Location permission is required for secure machine access"
              : "Unable to fetch your current location"
          )
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
}
