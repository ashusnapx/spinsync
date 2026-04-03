"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { Quote } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="pt-40 pb-32 px-6 max-w-4xl mx-auto">
      
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="text-center mb-24"
      >
        <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
          Built to solve <br/>
          <span className="gradient-text-heading">the laundry room chaos.</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/50 font-light max-w-2xl mx-auto leading-relaxed">
          SpinSync was born out of frustration. We were tired of lugging baskets down 4 flights of stairs, only to find all machines full and broken timers.
        </motion.p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="glass-elevated p-10 md:p-16 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 blur-[100px] pointer-events-none" />
        
        <Quote className="w-12 h-12 text-violet-400/50 mx-auto mb-8" />
        <p className="text-2xl md:text-3xl font-medium tracking-tight leading-relaxed mb-10 text-white/90">
          "Our mission is to bring invisible intelligence to physical hardware. We believe your time shouldn't be wasted standing in line."
        </p>
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-500 p-[2px] mb-4">
             <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-lg">A</div>
          </div>
          <h4 className="font-bold text-lg">Ashutosh Kumar</h4>
          <span className="text-white/50 text-sm font-light uppercase tracking-widest">Founder & Developer</span>
        </div>
      </motion.div>

    </div>
  );
}
