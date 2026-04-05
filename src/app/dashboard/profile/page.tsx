"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import {
  CalendarClock,
  ShieldCheck,
  CreditCard,
  Loader2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export default function ProfilePage() {
  const supabase = createSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsPending(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const user = session?.user;
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || "User";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
       <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Profile</h1>
        <p className="text-muted-foreground">Manage your DhobiQ account and member access.</p>
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* User Card */}
        <motion.div variants={fadeUp} className="md:col-span-2">
          <AnimatedCard className="p-8 h-full">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-600 flex items-center justify-center text-4xl font-black text-black shrink-0 relative">
                {userName.charAt(0).toUpperCase()}
                <div className="absolute inset-x-0 -bottom-2 flex justify-center">
                  <span className="px-2 py-0.5 rounded bg-black border border-white/20 text-[10px] font-bold tracking-widest uppercase text-white/80">Member</span>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold tracking-tight mb-1">{userName}</h2>
                <p className="text-muted-foreground mb-4">{user?.email}</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified Member
                  </div>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Rollout Status Card */}
        <motion.div variants={fadeUp}>
           <AnimatedCard className="p-6 h-full flex flex-col justify-center relative overflow-hidden" glow>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <Sparkles className="w-8 h-8 text-amber-400 mb-4" />
                <h3 className="text-xl font-bold mb-2">Current Rollout</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Queueing, gamification, and related billing upgrades are paused
                  for now. Your account remains fully active for machine access,
                  tenant coordination, and community chat.
                </p>
              </div>
           </AnimatedCard>
        </motion.div>
      </motion.div>

      {/* Settings List */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="pt-4">
        <h3 className="text-lg font-bold mb-4">Account Settings</h3>
        <div className="space-y-4">
          <SettingsRow icon={ShieldCheck} title="Two-Factor Authentication" description="Add an extra layer of security to your account." action="Enable" />
          <SettingsRow icon={CreditCard} title="Payment Methods" description="Manage your cards and UPI linked to DhobiQ." action="Manage" />
          <SettingsRow
            icon={CalendarClock}
            title="Calendar Reminders"
            description="Add pickup reminders from the machine screen to Google Calendar or Apple Calendar."
            action="Use at Start"
          />
        </div>
      </motion.div>

    </div>
  );
}

function SettingsRow({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 rounded-2xl bg-secondary border border-border hover:bg-secondary/80 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-muted-foreground shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground/90">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <button className="px-5 py-2 rounded-lg bg-background hover:bg-secondary font-medium text-sm transition-colors tabular-nums w-full sm:w-auto border border-border">
        {action}
      </button>
    </div>
  );
}
