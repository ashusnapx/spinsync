"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RadioTower,
  RefreshCw,
  TimerReset,
} from "lucide-react";

import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MachineActivitySession {
  id: string;
  machineId: string;
  userId: string;
  userName: string;
  machineName: string;
  machineType: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  stoppedByUserName?: string | null;
}

interface MachineActivityPayload {
  success: boolean;
  data?: {
    activeSessions: MachineActivitySession[];
    recentClosedSessions: MachineActivitySession[];
    lastUpdatedAt: string;
  };
  error?: {
    message?: string;
  };
}

const ACTIVITY_ROWS_PER_PAGE = 5;

export function MachineActivityPanel() {
  const [activeSessions, setActiveSessions] = useState<MachineActivitySession[]>([]);
  const [recentClosedSessions, setRecentClosedSessions] = useState<
    MachineActivitySession[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const lastLoadedAtRef = useRef(0);

  const fetchActivity = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch("/api/machines/activity", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json()) as MachineActivityPayload;

      if (!response.ok || !isMachineActivityPayload(payload) || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to load machine activity");
      }

      setActiveSessions(payload.data.activeSessions);
      setRecentClosedSessions(payload.data.recentClosedSessions);
      setLastUpdatedAt(payload.data.lastUpdatedAt);
      lastLoadedAtRef.current = Date.now();
    } catch {
      setActiveSessions([]);
      setRecentClosedSessions([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchActivity();

    const intervalId = window.setInterval(() => {
      if (document.hidden) {
        return;
      }

      void fetchActivity(false);
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        return;
      }

      if (Date.now() - lastLoadedAtRef.current < 45000) {
        return;
      }

      void fetchActivity(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchActivity]);

  const rows = useMemo(() => {
    const runningRows = activeSessions.map((session) => ({
      ...session,
      rowStatus: "running" as const,
    }));
    const closedRows = recentClosedSessions.slice(0, 8).map((session) => ({
      ...session,
      rowStatus: "closed" as const,
    }));

    return [...runningRows, ...closedRows].slice(0, 10);
  }, [activeSessions, recentClosedSessions]);

  const totalPages = Math.max(
    1,
    Math.ceil(rows.length / ACTIVITY_ROWS_PER_PAGE)
  );
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * ACTIVITY_ROWS_PER_PAGE;

    return rows.slice(startIndex, startIndex + ACTIVITY_ROWS_PER_PAGE);
  }, [currentPage, rows]);
  const pageStart = rows.length === 0 ? 0 : (currentPage - 1) * ACTIVITY_ROWS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * ACTIVITY_ROWS_PER_PAGE, rows.length);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <AnimatedCard className="h-full overflow-hidden p-0">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%)] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-white/35">
              Who&apos;s Using
            </div>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Live machine activity
            </h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-white/55">
              See who started a machine, when it went live, and which cycles have
              already been closed today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-right">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                Running now
              </div>
              <div className="mt-1 text-3xl font-black text-primary">
                {activeSessions.length}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchActivity(false)}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {lastUpdatedAt ? (
          <div className="mt-3 text-xs uppercase tracking-[0.18em] text-white/35">
            Last synced {formatDateTime(lastUpdatedAt)}
          </div>
        ) : null}
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
            <h4 className="text-lg font-semibold text-white">No machine activity yet</h4>
            <p className="mt-2 text-sm text-white/50">
              New sessions and recently closed cycles will appear here automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Status</TableHead>
                    <TableHead>Resident</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Closed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row) => (
                    <TableRow key={`${row.rowStatus}-${row.id}`}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            row.rowStatus === "running"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                              : "border-white/10 bg-white/5 text-white/65"
                          }
                        >
                          {row.rowStatus === "running" ? (
                            <>
                              <RadioTower className="mr-1 size-3.5" />
                              Running
                            </>
                          ) : (
                            <>
                              <TimerReset className="mr-1 size-3.5" />
                              Closed
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-white/85">{row.userName}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-white/35">
                          {formatMachineType(row.machineType)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-white/75">
                        {row.machineName}
                      </TableCell>
                      <TableCell className="text-white/60">
                        {formatDateTime(row.startedAt)}
                      </TableCell>
                      <TableCell className="text-white/60">
                        <div>{row.endedAt ? formatDateTime(row.endedAt) : "Active"}</div>
                        {row.rowStatus === "closed" && row.stoppedByUserName ? (
                          <div className="mt-1 text-xs text-white/40">
                            Stopped by {row.stoppedByUserName}
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-white/45">
                Showing {pageStart}-{pageEnd} of {rows.length} entries
              </div>

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
            </div>
          </>
        )}
      </div>
    </AnimatedCard>
  );
}

function isMachineActivityPayload(payload: unknown): payload is MachineActivityPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return "success" in payload;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMachineType(type: string) {
  return type
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
