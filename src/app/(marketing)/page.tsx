"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { fadeUp, staggerContainer, scaleIn } from "@/components/ui/Animations";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { HeroAppVector } from "@/components/illustrations/HeroAppVector";
import { ArrowRight, Sparkles, CheckCircle2, QrCode, MessageSquareHeart } from "lucide-react";

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  // JSON-LD injected in root, handled securely in layout.
  
  return (
    <div className="relative">
      
      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-16 lg:pt-12 lg:pb-24 flex flex-col justify-center px-4 xl:px-0 min-h-[85vh]">
        <motion.div style={{ y, opacity }} className="absolute inset-0 pointer-events-none" />
        
        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            <motion.div variants={fadeUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-secondary/50 backdrop-blur-xl text-muted-foreground text-sm font-medium tracking-wide shadow-sm">
                <Sparkles className="w-4 h-4 text-cyan-500" /> The intelligence layer for PGs
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-bold tracking-tight leading-[1.05] mb-6"
            >
              Laundry, <br className="hidden sm:block" />
              <span className="gradient-text-heading pr-4 drop-shadow-sm dark:drop-shadow-none text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">
                without the guesswork.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg lg:text-xl text-muted-foreground font-normal mb-10 leading-relaxed max-w-xl"
            >
              Real-time machine tracking, intelligent priority queues, and cryptographic access. No more wasted trips.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                href="/auth/signup"
                className="group relative px-8 py-4 bg-foreground text-background rounded-2xl font-semibold text-lg hover:shadow-[0_8px_32px_rgba(var(--primary),0.2)] hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span className="relative z-10 flex items-center gap-2">
                   Start Free <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary to-violet-500 transition-opacity duration-300" />
              </Link>
              <Link
                href="/auth/create-pg"
                className="px-8 py-4 bg-secondary border border-border backdrop-blur-md rounded-2xl font-medium text-lg hover:bg-secondary/80 transition-all duration-300 flex items-center justify-center text-foreground"
              >
                Partner with us
              </Link>
            </motion.div>
          </motion.div>

          <div className="flex justify-center lg:justify-end">
             <HeroAppVector />
          </div>

        </div>
      </section>

      {/* ═══ BENTO GRID FEATURES ═══ */}
      <section className="relative py-32 px-4 z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">Core Philosophy.</h2>
            <p className="text-xl text-muted-foreground font-normal">Calm. Precise. Effortless.</p>
          </motion.div>

          {/* Bento Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 auto-rows-[340px]">
             
            {/* BACKWARD COMPATIBILITY CARD CONTAINER (Removes need for AnimatedCard wrapper physics) */}
            {/* BIG CARD (60%) - Priority Queue */}
            <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once:true }} className="md:col-span-2 md:row-span-2 h-full">
              <div className="h-full p-8 md:p-12 flex flex-col justify-between group overflow-hidden bg-card border border-border shadow-sm rounded-3xl relative transition-transform duration-300 hover:-translate-y-1">
                <div className="relative z-10">
                  <h3 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3 text-card-foreground">Priority. Perfected.</h3>
                  <p className="text-muted-foreground text-lg max-w-sm">Fairness-decay algorithms prevent queue monopolization, rewarding precision timing.</p>
                </div>
                
                {/* Active Sub UI */}
                <div className="relative mt-8 mt-auto mx-auto w-full max-w-sm">
                  <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
                  <motion.div 
                    className="space-y-3"
                    animate={{ y: [0, -40, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  >
                     {[1,2,3].map((i) => (
                       <div key={i} className="bg-secondary/50 border border-border p-4 rounded-xl flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">#{i}</div>
                           <div className="h-4 w-24 bg-muted rounded" />
                         </div>
                         <div className="h-4 w-12 bg-muted rounded" />
                       </div>
                     ))}
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* MEDIUM CARD 1 - Live Sync */}
            <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once:true }} className="md:col-span-1 h-full">
              <div className="h-full p-8 group flex flex-col bg-card border border-border shadow-sm rounded-3xl relative transition-transform duration-300 hover:-translate-y-1">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold tracking-tight mb-2 text-card-foreground">Know before you go.</h3>
                  <p className="text-muted-foreground">Sub-second hardware sync. If it's spinning, you'll know.</p>
                </div>
                {/* Micro Animation UI */}
                <div className="mt-8 flex justify-end">
                   <div className="relative w-24 h-24">
                     <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                       <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-border" strokeWidth="8" />
                       <motion.circle 
                         cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-emerald-500" strokeWidth="8"
                         strokeDasharray="283"
                         initial={{ strokeDashoffset: 283 }}
                         whileInView={{ strokeDashoffset: 100 }}
                         transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                       />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center text-emerald-400 font-bold text-xl">
                       32m
                     </div>
                   </div>
                </div>
              </div>
            </motion.div>

            {/* MEDIUM CARD 2 - One Tap Access */}
            <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once:true }} className="md:col-span-1 h-full">
              <div className="h-full p-8 group flex flex-col bg-card border border-border shadow-sm rounded-3xl relative transition-transform duration-300 hover:-translate-y-1">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold tracking-tight mb-2 text-card-foreground">One-tap booking.</h3>
                  <p className="text-muted-foreground">Numbered machine fleets seamlessly match physical assets.</p>
                </div>
                <div className="mt-8 flex justify-end gap-3 opacity-90 transition-transform duration-500 will-change-transform group-hover:scale-110">
                   {[1, 2, 3].map((num) => (
                     <div key={num} className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl border ${num === 2 ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-secondary border-border text-muted-foreground'}`}>
                       {num}
                     </div>
                   ))}
                </div>
              </div>
            </motion.div>

            {/* SMALL CARD 1 */}
            <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once:true }} className="md:col-span-1 h-full">
               <div className="h-full p-8 group flex items-center gap-6 bg-card border border-border shadow-sm rounded-3xl relative transition-transform duration-300 hover:-translate-y-1">
                  <div className="w-16 h-16 shrink-0 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 transition-all duration-300 group-hover:bg-primary/20">
                     <MessageSquareHeart className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-card-foreground">Community Chat</h3>
                    <p className="text-muted-foreground text-sm">Coordinate locally.</p>
                  </div>
               </div>
            </motion.div>

            {/* SMALL CARD 2 */}
            <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once:true }} className="md:col-span-2 h-full">
               <div className="h-full p-8 group flex flex-col md:flex-row items-center justify-between gap-6 bg-card border border-border shadow-sm rounded-3xl relative transition-transform duration-300 hover:-translate-y-1">
                  <div>
                    <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-widest mb-4 inline-block">DhobiQ Pro</span>
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight text-card-foreground">Become undeniable.</h3>
                    <p className="text-muted-foreground max-w-sm mt-1">Upgrade to bypass logic and claim your machine. ₹299/mo.</p>
                  </div>
                  <Link href="/pricing" className="px-6 py-3 bg-foreground text-background font-semibold rounded-xl hover:scale-105 transition-transform duration-300 whitespace-nowrap">
                    View Pricing
                  </Link>
               </div>
            </motion.div>

          </div>
        </div>
      </section>

    </div>
  );
}
