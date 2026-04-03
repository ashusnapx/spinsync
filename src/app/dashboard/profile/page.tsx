"use client";

import { motion } from "framer-motion";
import { useSession } from "@/lib/auth-client";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { Crown, Zap, ShieldCheck, CreditCard, ChevronRight } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Profile & Billing</h1>
        <p className="text-white/50">Manage your SpinSync account and premium status.</p>
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* User Card */}
        <motion.div variants={fadeUp} className="md:col-span-2">
          <AnimatedCard className="p-8 h-full">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-600 flex items-center justify-center text-4xl font-black text-black shrink-0 relative">
                {session?.user.name?.charAt(0) || "U"}
                <div className="absolute inset-x-0 -bottom-2 flex justify-center">
                  <span className="px-2 py-0.5 rounded focus bg-black border border-white/20 text-[10px] font-bold tracking-widest uppercase text-white/80">Pro</span>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold tracking-tight mb-1">{session?.user.name || "User"}</h2>
                <p className="text-white/50 mb-4">{session?.user.email}</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified Member
                  </div>
                  <div className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3" /> 1,250 Points
                  </div>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Premium Upgrade Card */}
        <motion.div variants={fadeUp}>
           <AnimatedCard className="p-6 h-full flex flex-col justify-center relative overflow-hidden" glow>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Crown className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <Crown className="w-8 h-8 text-amber-400 mb-4" />
                <h3 className="text-xl font-bold mb-2">SpinSync Premium</h3>
                <p className="text-white/50 text-sm mb-6">You are currently on the free tier. Upgrade to jump the queue.</p>
                <button className="w-full bg-gradient-to-r from-amber-500 to-orange-400 text-black font-bold py-3 px-4 rounded-xl hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 transition-all flex items-center justify-center gap-2">
                  Upgrade ₹299/mo <ChevronRight className="w-4 h-4" />
                </button>
              </div>
           </AnimatedCard>
        </motion.div>
      </motion.div>

      {/* Settings List */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="pt-4">
        <h3 className="text-lg font-bold mb-4">Account Settings</h3>
        <div className="space-y-4">
          <SettingsRow icon={ShieldCheck} title="Two-Factor Authentication" description="Add an extra layer of security to your account." action="Enable" />
          <SettingsRow icon={CreditCard} title="Payment Methods" description="Manage your cards and UPI linked to SpinSync." action="Manage" />
          <SettingsRow icon={Zap} title="Notification Preferences" description="Choose how and when you get alerted." action="Configure" />
        </div>
      </motion.div>

    </div>
  );
}

function SettingsRow({ icon: Icon, title, description, action }: any) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/50 shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-semibold text-white/90">{title}</h4>
          <p className="text-sm text-white/50">{description}</p>
        </div>
      </div>
      <button className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-medium text-sm transition-colors tabular-nums w-full sm:w-auto">
        {action}
      </button>
    </div>
  );
}
