"use client";

import { ThreeBackground } from "@/components/ui/ThreeBackground";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex text-white overflow-hidden bg-black font-sans">
      <ThreeBackground />
      
      {/* Visual / Art Side (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-between p-12 overflow-hidden z-10 border-r border-white/5 bg-black/20 backdrop-blur-3xl">
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
        
        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl xl:text-5xl font-black mb-6 tracking-tight leading-tight">
              Manage laundry with <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">
                Absolute Precision.
              </span>
            </h1>
            <p className="text-white/60 text-lg font-light leading-relaxed">
              Join thousands of students and admins turning the laundry room 
              chaos into a seamless, orchestrated experience.
            </p>
          </motion.div>
        </div>
        
        {/* Abstract decorative elements */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full border border-white/5 bg-gradient-to-tr from-cyan-500/10 to-transparent blur-3xl opacity-50" />
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24 z-10 relative">
        <div className="lg:hidden absolute top-6 left-6 z-20">
          <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
        </div>
        
        <motion.div 
          className="w-full max-w-md mx-auto"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ease: "easeOut", duration: 0.5 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
