"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { QrCode, Play, AlertTriangle, ShieldCheck } from "lucide-react";

// Mock data (would be fetched from API)
const mockMachines = [
  { id: "1", name: "Washing Machine #1", type: "Washing", status: "free" },
  { id: "2", name: "Washing Machine #2", type: "Washing", status: "occupied", remaining: 12 },
  { id: "3", name: "Dryer #1", type: "Dryer", status: "grace_period", remaining: 3 },
  { id: "4", name: "Washing Machine #3", type: "Washing", status: "maintenance" },
];

export default function MachinesPage() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Machines</h1>
          <p className="text-white/50">Real-time status of all laundry machines.</p>
        </div>
        
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
          {["all", "free", "in_use"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-6 py-2 text-sm font-medium capitalize rounded-lg transition-colors ${
                activeTab === tab ? "text-white" : "text-white/50 hover:text-white"
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="machineTab"
                  className="absolute inset-0 bg-white/10 rounded-lg"
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                />
              )}
              <span className="relative z-10">{tab.replace("_", " ")}</span>
            </button>
          ))}
        </div>
      </div>

      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {mockMachines
          .filter(m => activeTab === "all" || (activeTab === "free" && m.status === "free") || (activeTab === "in_use" && m.status !== "free" && m.status !== "maintenance"))
          .map((machine) => (
          <MachineCard key={machine.id} machine={machine} />
        ))}
      </motion.div>
    </div>
  );
}

function MachineCard({ machine }: { machine: any }) {
  const statusColors: any = {
    free: "from-emerald-500 to-emerald-400 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)] text-emerald-400",
    occupied: "from-rose-500 to-red-500 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.2)] text-rose-400",
    grace_period: "from-amber-500 to-orange-400 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] text-amber-400",
    maintenance: "from-white/20 to-white/10 border-white/20 shadow-none text-white/40",
  };

  const statusText {
    free: "Available",
    occupied: "In Use",
    grace_period: "Please Collect",
    maintenance: "Maintenance"
  };

  const colorConfig = statusColors[machine.status];

  return (
    <motion.div variants={fadeUp}>
      <AnimatedCard className="overflow-hidden" glow={false}>
        {/* Dynamic top bar */}
        <div className={`h-2 w-full bg-gradient-to-r ${colorConfig.split(" ")[0]} ${colorConfig.split(" ")[1]}`} />
        
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start justify-between relative">
          
          {/* Breathing BG effect for active machines */}
          {machine.status === "occupied" && (
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px] animate-pulse pointer-events-none" />
          )}

          <div className="flex-1 w-full relative z-10 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h3 className="text-2xl font-bold tracking-tight">{machine.name}</h3>
              {machine.status === "free" && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
            </div>
            <p className="text-white/50">{machine.type}</p>

            <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
              <div className={`px-4 py-2 rounded-xl bg-white/5 border border-white/10 ${colorConfig.split(" ").slice(-1)[0]} font-medium flex items-center gap-2`}>
                <div className={`w-2 h-2 rounded-full bg-current ${machine.status !== 'maintenance' ? 'animate-pulse' : ''}`} />
                {statusText[machine.status as keyof typeof statusText]}
              </div>
              
              {machine.remaining && (
                 <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 font-mono font-medium">
                   {machine.remaining} mins left
                 </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-3 w-full md:w-auto z-10">
            {machine.status === "free" ? (
              <button className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-2xl font-bold hover:bg-emerald-500 hover:text-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <QrCode className="w-5 h-5" /> Start Scan
              </button>
            ) : machine.status === "occupied" ? (
               <div className="relative w-24 h-24 flex items-center justify-center">
                 {/* CSS spinning ring */}
                 <div className="absolute inset-0 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />
                 <div className="text-2xl font-black font-mono text-rose-400">{machine.remaining}</div>
               </div>
            ) : machine.status === "grace_period" ? (
               <div className="p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                 <AlertTriangle className="w-8 h-8 animate-pulse" />
               </div>
            ) : null}
          </div>
          
        </div>
      </AnimatedCard>
    </motion.div>
  );
}
