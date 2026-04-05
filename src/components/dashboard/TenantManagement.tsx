"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createTenantSchema,
  tenantSubscriptionStatuses,
  updateTenantSchema,
} from "@/forms/dashboard/tenant.schema";
import { useDashboardStore } from "@/stores/dashboard-store";
import { cn } from "@/lib/utils";

type TenantSubscriptionStatus = (typeof tenantSubscriptionStatuses)[number];

interface TenantRecord {
  userId: string;
  name: string;
  email: string;
  roomNumber: string;
  subscriptionStatus: TenantSubscriptionStatus;
  joinedAt: string;
  updatedAt: string;
  lastSignInAt: string | null;
}

interface TenantManagementProps {
  pgCode: string;
  pgName: string;
  initialTenantCount?: number;
}

interface TenantFormState {
  name: string;
  email: string;
  roomNumber: string;
  subscriptionStatus: TenantSubscriptionStatus;
  password: string;
}

const EMPTY_TENANT_FORM: TenantFormState = {
  name: "",
  email: "",
  roomNumber: "",
  subscriptionStatus: "free",
  password: "",
};

const TENANTS_PER_PAGE = 5;
const TENANT_CACHE_TTL_MS = 30000;
type TenantPageCacheEntry = {
  rows: TenantRecord[];
  total: number;
  expiresAt: number;
};

const tenantPageCache = new Map<string, TenantPageCacheEntry>();
const inFlightTenantRequests = new Map<
  string,
  Promise<{ rows: TenantRecord[]; total: number }>
>();

function clearTenantPageCache() {
  tenantPageCache.clear();
  inFlightTenantRequests.clear();
}

export function TenantManagement({
  pgCode,
  pgName,
  initialTenantCount,
}: TenantManagementProps) {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTenants, setTotalTenants] = useState(initialTenantCount ?? 0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<TenantFormState>(EMPTY_TENANT_FORM);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const updateTenantCount = useDashboardStore((state) => state.updateTenantCount);

  const fetchTenants = useCallback(async (
    page: number,
    showSpinner = true,
    force = false
  ) => {
    if (showSpinner) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const cacheKey = `${page}:${TENANTS_PER_PAGE}`;
      const cached = tenantPageCache.get(cacheKey);

      if (!force && cached && cached.expiresAt > Date.now()) {
        setTenants(sortTenants(cached.rows));
        setTotalTenants(cached.total);
        return;
      }

      let requestPromise = inFlightTenantRequests.get(cacheKey);

      if (!force && requestPromise) {
        const payload = await requestPromise;
        setTenants(sortTenants(payload.rows));
        setTotalTenants(payload.total);
        return;
      }

      requestPromise = fetch(`/api/tenants?page=${page}&limit=${TENANTS_PER_PAGE}`)
        .then(async (response) => {
          const payload = await response.json();

          if (!response.ok || !payload.success) {
            throw new Error(payload.error?.message ?? "Failed to load tenants");
          }

          const nextRows = payload.data as TenantRecord[];
          const nextPayload = {
            rows: nextRows,
            total: payload.meta?.total ?? nextRows.length,
          };

          tenantPageCache.set(cacheKey, {
            ...nextPayload,
            expiresAt: Date.now() + TENANT_CACHE_TTL_MS,
          });

          return nextPayload;
        })
        .finally(() => {
          inFlightTenantRequests.delete(cacheKey);
        });

      inFlightTenantRequests.set(cacheKey, requestPromise);

      const payload = await requestPromise;
      setTenants(sortTenants(payload.rows));
      setTotalTenants(payload.total);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load tenants";
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchTenants(currentPage);
  }, [currentPage, fetchTenants]);

  const displayedTenantCount = useMemo(
    () => (totalTenants > 0 || !isLoading ? totalTenants : initialTenantCount ?? 0),
    [initialTenantCount, isLoading, totalTenants]
  );
  const totalPages = Math.max(1, Math.ceil(displayedTenantCount / TENANTS_PER_PAGE));
  const pageStart = displayedTenantCount === 0 ? 0 : (currentPage - 1) * TENANTS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * TENANTS_PER_PAGE, displayedTenantCount);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!isLoading) {
      updateTenantCount(displayedTenantCount);
    }
  }, [displayedTenantCount, isLoading, updateTenantCount]);

  function openCreateDialog() {
    setFormMode("create");
    setEditingTenant(null);
    setFormState(EMPTY_TENANT_FORM);
    setFormError("");
    setIsFormOpen(true);
  }

  function openEditDialog(tenant: TenantRecord) {
    setFormMode("edit");
    setEditingTenant(tenant);
    setFormState({
      name: tenant.name,
      email: tenant.email,
      roomNumber: tenant.roomNumber,
      subscriptionStatus: tenant.subscriptionStatus,
      password: "",
    });
    setFormError("");
    setIsFormOpen(true);
  }

  function closeFormDialog() {
    setIsFormOpen(false);
    setFormError("");
    setEditingTenant(null);
    setFormState(EMPTY_TENANT_FORM);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const rawPayload =
      formMode === "create"
        ? formState
        : {
            ...formState,
            password: formState.password.trim() || undefined,
          };

    const parsed =
      formMode === "create"
        ? createTenantSchema.safeParse(rawPayload)
        : updateTenantSchema.safeParse(rawPayload);

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Please review the form.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        formMode === "create"
          ? "/api/tenants"
          : `/api/tenants/${editingTenant?.userId ?? ""}`,
        {
          method: formMode === "create" ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parsed.data),
        }
      );

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Failed to save tenant");
      }

      const nextPage = formMode === "create" ? 1 : currentPage;
      clearTenantPageCache();

      if (nextPage !== currentPage) {
        setCurrentPage(nextPage);
      } else {
        await fetchTenants(nextPage, false, true);
      }

      toast.success(
        formMode === "create"
          ? "Tenant account created"
          : "Tenant details updated"
      );
      closeFormDialog();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save tenant";
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/tenants/${deleteTarget.userId}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Failed to delete tenant");
      }

      const result = payload.data as {
        authDeleted: boolean;
        authDeleteError: string | null;
      };
      const nextPage =
        tenants.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      clearTenantPageCache();

      if (nextPage !== currentPage) {
        setCurrentPage(nextPage);
      } else {
        await fetchTenants(nextPage, false, true);
      }

      if (result.authDeleted) {
        toast.success("Tenant deleted");
      } else {
        toast.warning("Tenant access removed, but auth cleanup needs review", {
          description: result.authDeleteError ?? "The profile was removed from this PG.",
        });
      }

      setDeleteTarget(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete tenant";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
        <CardHeader className="gap-3 border-b border-white/10 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  PG Owner
                </Badge>
                <Badge variant="secondary" className="bg-white/10 text-white/80">
                  Join code {pgCode}
                </Badge>
              </div>
              <CardTitle className="text-2xl">Tenant Directory</CardTitle>
              <CardDescription className="max-w-2xl text-white/60">
                Create, update, and remove tenant access for {pgName}. Tenants can
                also self-join with your invite code, and they will appear here
                automatically after onboarding.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchTenants(currentPage, false, true)}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Refresh
              </Button>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="size-4" />
                Add Tenant
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryTile
              icon={Users}
              label="Active tenants"
              value={String(displayedTenantCount)}
              hint="Live membership in this PG"
            />
            <SummaryTile
              icon={ShieldCheck}
              label="Join code"
              value={pgCode}
              hint="Share this code with self-joining tenants"
            />
            <SummaryTile
              icon={RefreshCw}
              label="Admin control"
              value="Full CRUD"
              hint="Create, update room details, and revoke access"
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-4 min-h-56 rounded-2xl border border-dashed border-white/10 bg-black/10 p-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
              <h3 className="text-lg font-semibold text-white">
                No tenants yet
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">
                Share the PG code <span className="font-mono text-primary">{pgCode}</span> with
                residents, or create their accounts directly from here.
              </p>
              <Button className="mt-6" onClick={openCreateDialog}>
                <Plus className="size-4" />
                Add first tenant
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/10">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Tenant</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last sign-in</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                            {getInitials(tenant.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white">
                              {tenant.name}
                            </div>
                            <div className="truncate text-sm text-white/50">
                              {tenant.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-white/80">
                        {tenant.roomNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getPlanVariant(tenant.subscriptionStatus)}
                          className={cn(
                            tenant.subscriptionStatus === "premium" &&
                              "bg-emerald-500/15 text-emerald-300",
                            tenant.subscriptionStatus === "expired" &&
                              "bg-amber-500/15 text-amber-300"
                          )}
                        >
                          {formatSubscriptionStatus(tenant.subscriptionStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/60">
                        {formatDate(tenant.joinedAt)}
                      </TableCell>
                      <TableCell className="text-white/60">
                        {tenant.lastSignInAt
                          ? formatDateTime(tenant.lastSignInAt)
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(tenant)}
                          >
                            <Pencil className="size-4" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(tenant)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-between gap-3 border-t border-white/10 bg-white/5">
          <p className="text-sm text-white/50">
            Owner actions are scoped to tenants inside this PG only. Showing{" "}
            {pageStart}-{pageEnd} of {displayedTenantCount}.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <div className="min-w-20 text-center text-sm text-white/45">
              Page {currentPage} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsFormOpen(true);
            return;
          }

          closeFormDialog();
        }}
      >
        <DialogContent className="max-w-xl border border-white/10 bg-[#11131a] text-white">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Add tenant" : "Edit tenant"}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {formMode === "create"
                ? "Create a tenant account and map it directly into this PG."
                : "Update tenant details, room assignment, or subscription access."}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Full name"
                value={formState.name}
                onChange={(value) =>
                  setFormState((current) => ({ ...current, name: value }))
                }
                placeholder="Rahul Sharma"
              />
              <Field
                label="Room number"
                value={formState.roomNumber}
                onChange={(value) =>
                  setFormState((current) => ({ ...current, roomNumber: value }))
                }
                placeholder="B-204"
              />
            </div>

            <Field
              label="Email address"
              type="email"
              value={formState.email}
              onChange={(value) =>
                setFormState((current) => ({ ...current, email: value }))
              }
              placeholder="tenant@example.com"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subscriptionStatus">
                  Subscription
                </Label>
                <select
                  id="subscriptionStatus"
                  value={formState.subscriptionStatus}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      subscriptionStatus: event.target
                        .value as TenantSubscriptionStatus,
                    }))
                  }
                  className="input h-11"
                >
                  {tenantSubscriptionStatuses.map((status) => (
                    <option key={status} value={status}>
                      {formatSubscriptionStatus(status)}
                    </option>
                  ))}
                </select>
              </div>

              <Field
                label={formMode === "create" ? "Temporary password" : "Reset password"}
                type="password"
                value={formState.password}
                onChange={(value) =>
                  setFormState((current) => ({ ...current, password: value }))
                }
                placeholder={
                  formMode === "create"
                    ? "At least 8 characters"
                    : "Leave blank to keep unchanged"
                }
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
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : formMode === "create" ? (
                  <Plus className="size-4" />
                ) : (
                  <Pencil className="size-4" />
                )}
                {formMode === "create" ? "Create tenant" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-md border border-white/10 bg-[#11131a] text-white">
          <DialogHeader>
            <DialogTitle>Delete tenant</DialogTitle>
            <DialogDescription className="text-white/60">
              {deleteTarget
                ? `Remove ${deleteTarget.name} from ${pgName}. This revokes access immediately.`
                : "Remove this tenant from the PG."}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            This action removes the tenant profile from your PG and attempts to
            delete their authentication account as well.
          </div>

          <DialogFooter className="-mx-0 -mb-0 rounded-xl border-0 bg-transparent p-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: React.HTMLInputTypeAttribute;
}) {
  const fieldId = useId();
  const id = `${label.toLowerCase().replace(/\s+/g, "-")}-${fieldId}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50">{label}</span>
        <Icon className="size-4 text-primary" />
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      <p className="mt-1 text-xs text-white/45">{hint}</p>
    </div>
  );
}

function sortTenants(tenants: TenantRecord[]): TenantRecord[] {
  return [...tenants].sort(
    (left, right) =>
      new Date(right.joinedAt).getTime() - new Date(left.joinedAt).getTime()
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSubscriptionStatus(status: TenantSubscriptionStatus): string {
  if (status === "premium") return "Premium";
  if (status === "expired") return "Expired";
  return "Free";
}

function getPlanVariant(status: TenantSubscriptionStatus) {
  if (status === "premium") return "secondary" as const;
  if (status === "expired") return "outline" as const;
  return "outline" as const;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
