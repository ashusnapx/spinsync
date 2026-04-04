"use client";

import { motion } from "framer-motion";
import type { ComponentType } from "react";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { Activity, Clock, BarChart3, ArrowUpRight, Zap, Copy, Check, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TenantManagement } from "@/components/dashboard/TenantManagement";

interface PgData {
  id: string;
  name: string;
  code: string;
  address: string;
  machineCount: number;
  tenantCount: number;
  role: "pg_admin" | "free_user" | "premium_user";
}

export default function DashboardOverview() {
  const [pgData, setPgData] = useState<PgData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/pg")
      .then(res => res.json())
      .then(data => {
        if (data.success) setPgData(data.data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleCopyCode = () => {
    if (!pgData?.code) return;
    navigator.clipboard.writeText(pgData.code);
    setCopied(true);
    toast.success("Join code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Overview</h1>
        <p className="text-white/50">
          {isLoading ? "Loading your PG data..." : `Welcome back. Here's what's happening at ${pgData?.name || "your PG"} today.`}
        </p>
      </div>

      {pgData?.role === "pg_admin" && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <AnimatedCard className="p-6 overflow-hidden relative" glow>
             <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Info className="w-32 h-32 text-primary" />
             </div>
             <div className="relative z-10">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div>
                   <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                     Share Join Code
                   </h3>
                   <p className="text-sm text-white/50">Tenants need this 6-character code to join your DhobiQ club.</p>
                 </div>
                 
                 <div className="flex items-center gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
                       <span className="text-4xl font-black tracking-[0.2em] font-mono text-primary animate-pulse-slow">
                         {pgData.code}
                       </span>
                    </div>
                    <button 
                      onClick={handleCopyCode}
                      className="p-4 rounded-2xl bg-primary text-white hover:bg-primary/80 transition-all active:scale-95 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                    >
                      {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                    </button>
                 </div>
               </div>
             </div>
          </AnimatedCard>
        </motion.div>
      )}

      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard title="Active Machines" value={isLoading ? "..." : (pgData?.machineCount || "0")} total={pgData?.machineCount} icon={Activity} color="cyan" trend="+2 since yesterday" glow />
        <StatCard title={pgData?.role === "pg_admin" ? "Tenants" : "Queue Length"} value={pgData?.role === "pg_admin" ? (isLoading ? "..." : (pgData?.tenantCount || "0")) : "12"} icon={BarChart3} color="violet" trend={pgData?.role === "pg_admin" ? "Residents mapped to your PG" : "Peak hours right now"} />
        <StatCard title="Avg Wait Time" value="40m" icon={Clock} color="amber" trend="-5m vs last week" />
        <StatCard title="Your Points" value="1,250" icon={Zap} color="emerald" trend="Top 5% in PG (Rank #3)" glow />
      </motion.div>

      {pgData?.role === "pg_admin" && pgData?.code && (
        <TenantManagement
          pgCode={pgData.code}
          pgName={pgData.name}
          initialTenantCount={pgData.tenantCount}
          onTenantCountChange={(tenantCount) =>
            setPgData((current) =>
              current ? { ...current, tenantCount } : current
            )
          }
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <AnimatedCard className="p-6 h-full min-h-[400px]">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Usage Heatmap</h3>
                <button className="text-sm text-cyan-400 font-medium hover:text-cyan-300 flex items-center gap-1">
                  View Full Report <ArrowUpRight className="w-4 h-4" />
                </button>
             </div>
             {/* Abstract chart visualization */}
             <div className="h-[250px] flex items-end justify-between gap-2 px-2">
                {[40, 70, 45, 90, 65, 30, 85].map((val, i) => (
                  <div key={i} className="flex-1 bg-white/5 rounded-t-lg relative group h-full flex items-end">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${val}%` }}
                      transition={{ duration: 1, type: "spring", delay: i * 0.1 }}
                      className="w-full bg-gradient-to-t from-cyan-500/20 to-cyan-500/80 rounded-t-lg relative"
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        {val}
                      </div>
                    </motion.div>
                  </div>
                ))}
             </div>
             <div className="flex justify-between mt-4 text-xs text-white/40 px-2">
               <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
             </div>
          </AnimatedCard>
        </motion.div>

        <motion.div variants={fadeUp}>
          <AnimatedCard className="p-6 h-full">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Feed
            </h3>
            <div className="space-y-6">
              {[
                { time: "2 min ago", text: "Rahul finished washing on Machine #2" },
                { time: "15 min ago", text: "You earned 'Early Bird' achievement!" },
                { time: "1 hr ago", text: "Machine #4 is back online." },
                { time: "2 hrs ago", text: "System maintenance complete." },
              ].map((item, i) => (
                <div key={i} className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-[-20px] before:w-[2px] before:bg-white/10 last:before:hidden">
                  <div className="absolute left-2 top-2 w-2 h-2 rounded-full bg-white/20 ring-4 ring-[#12121a]" />
                  <p className="text-sm font-medium">{item.text}</p>
                  <p className="text-xs text-white/40 mt-1">{item.time}</p>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </motion.div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  total?: number;
  icon: ComponentType<{ className?: string }>;
  color: "cyan" | "violet" | "amber" | "emerald";
  trend?: string;
  glow?: boolean;
}

function StatCard({ title, value, total, icon: Icon, color, trend, glow = false }: StatCardProps) {
  const colorMap: Record<StatCardProps["color"], string> = {
    cyan: "text-cyan-400 bg-cyan-400/10",
    violet: "text-violet-400 bg-violet-400/10",
    amber: "text-amber-400 bg-amber-400/10",
    emerald: "text-emerald-400 bg-emerald-400/10",
  };

  return (
    <motion.div variants={fadeUp}>
      <AnimatedCard className="p-6" glow={glow} tiltMax={5}>
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${colorMap[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div className="mb-1 text-white/60 font-medium text-sm">{title}</div>
        <div className="text-3xl font-bold flex items-baseline gap-2">
          {value} {total && <span className="text-lg font-normal text-white/30">/ {total}</span>}
        </div>
        {trend && (
          <div className="mt-4 text-xs font-medium text-white/40">
            {trend}
          </div>
        )}
      </AnimatedCard>
    </motion.div>
  );
}
