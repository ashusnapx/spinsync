"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Loader2,
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
import { Textarea } from "@/components/ui/textarea";
import { useDashboardStore } from "@/stores/dashboard-store";

type MachineType = "washing_machine" | "dryer" | "iron" | "dishwasher";

interface MachineRecord {
  id: string;
  name: string;
  type: MachineType;
  status: MachineCardStatus;
  orgId: string;
  floor: string | null;
  location: string | null;
  qrSecret: string | null;
  currentSessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MachineFormState {
  name: string;
  type: MachineType;
  floor: string;
  locationDescription: string;
}

const EMPTY_MACHINE_FORM: MachineFormState = {
  name: "",
  type: "washing_machine",
  floor: "",
  locationDescription: "",
};

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

  const fetchMachines = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch("/api/machines", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Failed to load machines");
      }

      setMachines(sortMachines(payload.data as MachineRecord[]));
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

    const interval = window.setInterval(() => {
      void fetchMachines(false);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [fetchMachines]);

  const isAdmin = pgData?.role === "pg_admin";

  const filteredMachines = useMemo(
    () => ({
      all: machines,
      available: machines.filter((machine) => machine.status === "free"),
      active: machines.filter((machine) =>
        ["occupied", "grace_period", "locked"].includes(machine.status)
      ),
      attention: machines.filter((machine) =>
        ["maintenance", "out_of_order", "locked"].includes(machine.status)
      ),
    }),
    [machines]
  );

  const handleStartMachine = async (machineId: string) => {
    await runMachineMutation({
      machineId,
      request: () =>
        fetch(`/api/machines/${machineId}/start`, {
          method: "POST",
        }),
      successMessage: "Machine started",
      successDescription: "Session is live and the machine is now occupied.",
    });
  };

  const handleStopMachine = async (machineId: string) => {
    await runMachineMutation({
      machineId,
      request: () =>
        fetch(`/api/machines/${machineId}/stop`, {
          method: "POST",
        }),
      successMessage: "Machine moved to grace period",
      successDescription: "The wash cycle has been stopped successfully.",
    });
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
    setIsFormOpen(true);
  };

  const openEditDialog = (machine: MachineRecord) => {
    setFormMode("edit");
    setEditingMachine(machine);
    setFormState({
      name: machine.name,
      type: machine.type,
      floor: machine.floor ?? "",
      locationDescription: machine.location ?? "",
    });
    setFormError("");
    setIsFormOpen(true);
  };

  const closeFormDialog = () => {
    setIsFormOpen(false);
    setFormError("");
    setEditingMachine(null);
    setFormState(EMPTY_MACHINE_FORM);
  };

  const handleSaveMachine = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const name = formState.name.trim();
    if (!name) {
      setFormError("Machine name is required.");
      return;
    }

    setIsSavingMachine(true);

    try {
      const payload = {
        name,
        type: formState.type,
        floor: formState.floor.trim() || null,
        locationDescription: formState.locationDescription.trim() || null,
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
        const createdMachine = body.data as MachineRecord;
        setMachines((currentMachines) =>
          sortMachines([...currentMachines, createdMachine])
        );
        updatePgData((currentPgData) =>
          currentPgData
            ? {
                ...currentPgData,
                machineCount: currentPgData.machineCount + 1,
              }
            : currentPgData
        );
        toast.success("Machine created");
      } else {
        const updatedMachine = body.data as MachineRecord;
        setMachines((currentMachines) =>
          sortMachines(
            currentMachines.map((machine) =>
              machine.id === updatedMachine.id ? updatedMachine : machine
            )
          )
        );
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
    onSuccess?: () => void;
    skipRefresh?: boolean;
  }) => {
    setBusyMachineId(machineId);

    try {
      const response = await request();
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Request failed");
      }

      onSuccess?.();

      if (!skipRefresh) {
        await fetchMachines(false);
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
              ? "Manage machine lifecycle, QR access, and operational status."
              : "Start and stop machines with live status visibility."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchMachines(false)}
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
              Capture the machine name, type, and physical placement so residents
              know exactly what they are operating.
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

            <div className="space-y-2">
              <Label htmlFor="machine-location">Location details</Label>
              <Textarea
                id="machine-location"
                value={formState.locationDescription}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    locationDescription: event.target.value,
                  }))
                }
                placeholder="Laundry room near the rear staircase"
                className="min-h-28"
              />
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
  onStart: (machineId: string) => void;
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
            location={machine.location}
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
  onStart: (machineId: string) => void;
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
        onClick: () => onStart(machine.id),
      };
    case "occupied":
      return {
        label: isAdmin ? "Stop Cycle" : "Stop If Mine",
        icon: StopCircle,
        disabled,
        onClick: () => onStop(machine.id),
      };
    case "grace_period":
      return isAdmin
        ? {
            label: "Release Machine",
            icon: RotateCcw,
            disabled,
            onClick: () => onStatusChange(machine.id, "free"),
          }
        : {
            label: "Grace Period Active",
            icon: Loader2,
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
