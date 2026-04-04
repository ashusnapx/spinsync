import { create } from "zustand";

export interface PgData {
  id: string;
  name: string;
  code: string;
  address: string;
  machineCount: number;
  tenantCount: number;
  role: "pg_admin" | "free_user" | "premium_user";
}

type DashboardStatus = "idle" | "loading" | "ready" | "error";

interface DashboardStore {
  pgData: PgData | null;
  status: DashboardStatus;
  error: string | null;
  fetchPgData: (force?: boolean) => Promise<PgData | null>;
  clearPgData: () => void;
  updateTenantCount: (tenantCount: number) => void;
  updatePgData: (updater: (current: PgData | null) => PgData | null) => void;
}

let inFlightPgRequest: Promise<PgData | null> | null = null;

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  pgData: null,
  status: "idle",
  error: null,

  async fetchPgData(force = false) {
    const { pgData, status } = get();

    if (!force && pgData) {
      return pgData;
    }

    if (!force && status === "loading" && inFlightPgRequest) {
      return inFlightPgRequest;
    }

    set({ status: "loading", error: null });

    inFlightPgRequest = fetch("/api/pg", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.error?.message ?? "Failed to load PG details"
          );
        }

        const nextPgData = payload.data as PgData;
        set({
          pgData: nextPgData,
          status: "ready",
          error: null,
        });

        return nextPgData;
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Failed to load PG details";

        set({
          status: "error",
          error: message,
        });

        throw error;
      })
      .finally(() => {
        inFlightPgRequest = null;
      });

    return inFlightPgRequest;
  },

  clearPgData() {
    inFlightPgRequest = null;
    set({
      pgData: null,
      status: "idle",
      error: null,
    });
  },

  updateTenantCount(tenantCount) {
    set((state) => ({
      pgData: state.pgData
        ? {
            ...state.pgData,
            tenantCount,
          }
        : state.pgData,
    }));
  },

  updatePgData(updater) {
    set((state) => ({
      pgData: updater(state.pgData),
    }));
  },
}));
