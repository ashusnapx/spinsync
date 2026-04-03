"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer, scaleIn } from "@/components/ui/Animations";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { CheckCircle2, Crown, Zap } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="pt-40 pb-32 px-4 max-w-7xl mx-auto">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="text-center mb-20"
      >
        <motion.div variants={fadeUp}>
           <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-sm font-medium tracking-wide shadow-sm mb-6">
             <Crown className="w-4 h-4" /> Transparent Pricing
           </span>
        </motion.div>
        
        <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Start for <span className="gradient-text-heading">free.</span><br />
          Become <span className="text-cyan-400">undeniable.</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/50 font-normal max-w-2xl mx-auto leading-relaxed">
          SpinSync fundamentally changes hostelling. Upgrade to Pro when you're tired of waiting in line.
        </motion.p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
        
        {/* Free Plan */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
          <div className="glass p-10 flex flex-col h-full rounded-3xl border-white/[0.04]">
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2 text-white/80">Basic Sync</h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-black">₹0</span>
                <span className="text-white/50 font-medium">/forever</span>
              </div>
              <p className="text-white/50 font-light text-sm">Everything you need to view machines and join standard queues.</p>
            </div>

            <ul className="flex-1 space-y-4 mb-10">
              {["Real-time status tracking", "Standard queue limits", "Community PG chat", "Email notifications"].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-white/80 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> {feature}
                </li>
              ))}
            </ul>

            <button className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 font-semibold transition-colors duration-300">
              Get Started
            </button>
          </div>
        </motion.div>

        {/* Pro Plan */}
        <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={2}>
          <div className="glass p-10 flex flex-col h-full rounded-[28px] relative overflow-hidden ring-1 ring-cyan-500/50 shadow-[0_0_40px_rgba(0,212,255,0.1)]">
            
            {/* Pro Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 blur-[80px] -translate-y-1/2 translate-x-1/2" />
            
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-violet-500 text-black px-6 py-1 rounded-b-xl text-xs font-bold uppercase tracking-widest shadow-sm">
              Maximum Priority
            </div>

            <div className="mb-8 mt-4 relative z-10">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-cyan-400">
                <Zap className="w-5 h-5" /> SpinSync Pro
              </h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-6xl font-black">₹299</span>
                <span className="text-white/50 font-medium">/month</span>
              </div>
              <p className="text-white/50 font-light text-sm">Skip the line algorithms. Earn VIP multipliers in the Smart Queue.</p>
            </div>

            <ul className="flex-1 space-y-4 mb-10 relative z-10">
              {["3x Priority Queue Boost", "Instant push notifications", "Ad-free experience", "Premium profile badges", "Detailed usage analytics"].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-white">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" /> {feature}
                </li>
              ))}
            </ul>

            <button className="relative z-10 w-full py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-bold hover:shadow-[0_4px_24px_rgba(0,212,255,0.4)] hover:scale-[1.02] transition-all duration-300">
              Upgrade to Pro
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
