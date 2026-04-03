"use client";

import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { ArrowUp, ArrowDown, Clock, Zap, Crown } from "lucide-react";

const mockQueue = [
  { id: 1, name: "Rahul S.", points: 1250, isPremium: true, waitTime: "2m", trend: "up", isMe: false },
  { id: 2, name: "Amit K.", points: 900, isPremium: false, waitTime: "5m", trend: "down", isMe: false },
  { id: 3, name: "You", points: 850, isPremium: false, waitTime: "12m", trend: "up", isMe: true },
  { id: 4, name: "Sneha M.", points: 1500, isPremium: true, waitTime: "15m", trend: "same", isMe: false },
  { id: 5, name: "Rohan J.", points: 300, isPremium: false, waitTime: "25m", trend: "down", isMe: false },
];

export default function QueuePage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Live Queue</h1>
          <p className="text-white/50">Smart queue ordered by priority score and wait time.</p>
        </div>
        <button className="px-6 py-3 rounded-full bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/30 hover:bg-cyan-500 hover:text-black transition-colors w-fit">
          Join Queue
        </button>
      </div>

      <AnimatedCard className="p-2 md:p-6 !bg-transparent border-none">
        <motion.div 
          layout
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          <AnimatePresence>
            {mockQueue.map((user, index) => (
              <QueueItem key={user.id} user={user} rank={index + 1} />
            ))}
          </AnimatePresence>
        </motion.div>
      </AnimatedCard>

      {/* Info Section */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="pt-8">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row gap-6 items-start">
          <div className="p-4 rounded-xl bg-violet-500/10 text-violet-400 shrink-0">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold mb-2">How priority works</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Your position is calculated based on <strong className="text-white">Wait Time</strong> + <strong className="text-white">SpinPoints</strong>. 
              Premium users receive a fair multiplier, and fairness-decay prevents anyone from hogging the top spot. 
              Be punctual to earn more points!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function QueueItem({ user, rank }: { user: any; rank: number }) {
  const isTop = rank === 1;

  return (
    <motion.div
      layout
      variants={fadeUp}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative flex items-center gap-4 p-4 md:p-6 rounded-2xl border transition-all ${
        user.isMe
          ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(0,212,255,0.15)] ring-1 ring-cyan-400/50"
          : isTop
          ? "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border-violet-500/30"
          : "bg-white/5 border-white/10"
      }`}
    >
      <div className="w-10 text-center font-bold text-2xl text-white/30 shrink-0">
        #{rank}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={`font-bold truncate ${user.isMe ? "text-cyan-400" : "text-white"}`}>
            {user.name}
          </h3>
          {user.isPremium && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-white/50">
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {user.points} pts</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Waiting {user.waitTime}</span>
        </div>
      </div>

      <div className="shrink-0">
        {user.trend === "up" && <ArrowUp className="w-5 h-5 text-emerald-400" />}
        {user.trend === "down" && <ArrowDown className="w-5 h-5 text-rose-400" />}
        {user.trend === "same" && <div className="w-5 h-1 rounded-full bg-white/20" />}
      </div>
    </motion.div>
  );
}
