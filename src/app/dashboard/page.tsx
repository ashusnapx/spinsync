"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Check,
  Copy,
  KeyRound,
  MapPin,
  ShieldCheck,
  Users,
  WashingMachine,
} from "lucide-react";
import { toast } from "sonner";

import { TenantManagement } from "@/components/dashboard/TenantManagement";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { Badge } from "@/components/ui/badge";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard-store";

export default function DashboardOverview() {
  const pgData = useDashboardStore((state) => state.pgData);
  const status = useDashboardStore((state) => state.status);
  const fetchPgData = useDashboardStore((state) => state.fetchPgData);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pgData && status === "idle") {
      void fetchPgData();
    }
  }, [fetchPgData, pgData, status]);

  const isLoading = status === "idle" || status === "loading";

  const handleCopyCode = async () => {
    if (!pgData?.code) return;

    await navigator.clipboard.writeText(pgData.code);
    setCopied(true);
    toast.success("Join code copied to clipboard");
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Overview</h1>
        <p className="text-white/50">
          {isLoading
            ? "Loading your PG data..."
            : `Everything for ${pgData?.name ?? "your PG"} in one place.`}
        </p>
      </div>

      {pgData?.role === "pg_admin" && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <AnimatedCard className="p-6 overflow-hidden relative" glow>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/10 text-primary"
                >
                  PG Owner Access
                </Badge>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Share your PG join code
                  </h2>
                  <p className="text-sm text-white/55">
                    Tenants can join {pgData.name} from signup using this code.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/40">
                    Join Code
                  </div>
                  <div className="mt-1 font-mono text-4xl font-black tracking-[0.26em] text-primary">
                    {pgData.code}
                  </div>
                </div>

                <Button
                  size="icon-lg"
                  onClick={() => void handleCopyCode()}
                  className="shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                >
                  {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
                </Button>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>
      )}

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
      >
        <InfoCard
          icon={Building2}
          title="PG Name"
          value={isLoading ? "..." : pgData?.name ?? "Unavailable"}
          subtitle="Your active organization"
        />
        <InfoCard
          icon={WashingMachine}
          title="Machines"
          value={isLoading ? "..." : String(pgData?.machineCount ?? 0)}
          subtitle="Configured in this PG"
        />
        <InfoCard
          icon={Users}
          title={pgData?.role === "pg_admin" ? "Tenants" : "Membership"}
          value={
            isLoading
              ? "..."
              : pgData?.role === "pg_admin"
              ? String(pgData?.tenantCount ?? 0)
              : "Active"
          }
          subtitle={
            pgData?.role === "pg_admin"
              ? "Residents currently mapped"
              : "You are linked to this PG"
          }
        />
        <InfoCard
          icon={ShieldCheck}
          title="Access Level"
          value={formatRole(pgData?.role)}
          subtitle="Permissions active on this account"
        />
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <AnimatedCard className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <MapPin className="size-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Registered Address</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {isLoading
                  ? "Loading location..."
                  : pgData?.address ?? "Address unavailable"}
              </p>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 text-white/80">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Current Rollout</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Gamification, the public queue, and in-app machine alerts remain
                disabled. Machine controls, tenant management, activity tracking,
                community chat, and calendar reminder handoff are active.
              </p>
            </div>
          </div>
        </AnimatedCard>
      </motion.div>

      {pgData?.role === "pg_admin" && pgData?.code && (
        <TenantManagement
          pgCode={pgData.code}
          pgName={pgData.name}
          initialTenantCount={pgData.tenantCount}
        />
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <motion.div variants={fadeUp}>
      <AnimatedCard className="p-6 h-full">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-white/55">{title}</div>
            <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
            <div className="mt-2 text-sm text-white/45">{subtitle}</div>
          </div>
          <div className="rounded-2xl bg-white/5 p-3 text-primary">
            <Icon className="size-5" />
          </div>
        </div>
      </AnimatedCard>
    </motion.div>
  );
}

function formatRole(role: "pg_admin" | "free_user" | "premium_user" | undefined) {
  if (role === "pg_admin") return "PG Owner";
  if (role === "premium_user") return "Premium Member";
  if (role === "free_user") return "Resident";
  return "...";
}
