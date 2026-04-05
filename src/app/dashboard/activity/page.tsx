"use client";

import { Activity } from "lucide-react";

import { MachineActivityPanel } from "@/components/dashboard/MachineActivityPanel";

export default function DashboardActivityPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/45">
          <Activity className="size-4 text-primary" />
          Live Ops
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Who&apos;s Using</h1>
        <p className="mt-2 text-white/50">
          Track active washing machine sessions and today&apos;s recently closed cycles.
        </p>
      </div>

      <MachineActivityPanel />
    </div>
  );
}
