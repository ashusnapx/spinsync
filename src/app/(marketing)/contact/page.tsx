"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/components/ui/Animations";
import { Send, Mail, MapPin } from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="pt-40 pb-32 px-6 max-w-6xl mx-auto">
       <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-16"
      >
        {/* Left Col */}
        <motion.div variants={fadeUp} className="flex flex-col justify-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Let's <span className="text-cyan-400">connect.</span>
          </h1>
          <p className="text-lg text-white/50 font-light leading-relaxed mb-12 max-w-md">
            Whether you want to deploy SpinSync in your PG, report a bug, or just say hello, we're here to help.
          </p>

          <div className="space-y-8">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/[0.08]">
                 <Mail className="w-5 h-5 text-cyan-400" />
               </div>
               <div>
                 <p className="text-sm text-white/50 font-medium">Email Us</p>
                 <a href="mailto:hello@spinsync.app" className="text-lg font-bold hover:text-cyan-400 transition-colors">hello@spinsync.app</a>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/[0.08]">
                 <MapPin className="w-5 h-5 text-violet-400" />
               </div>
               <div>
                 <p className="text-sm text-white/50 font-medium">Headquarters</p>
                 <p className="text-lg font-bold">Bangalore, IN</p>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Right Col / Form */}
        <motion.div variants={fadeUp}>
           <form onSubmit={handleSubmit} className="glass p-8 md:p-10 flex flex-col gap-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[80px]" />
             
             <div className="relative z-10 flex flex-col gap-2">
               <label className="text-sm font-semibold text-white/70">Name</label>
               <input required type="text" placeholder="Tim Cook" className="bg-black/40 border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" />
             </div>

             <div className="relative z-10 flex flex-col gap-2">
               <label className="text-sm font-semibold text-white/70">Email Address</label>
               <input required type="email" placeholder="tim@apple.com" className="bg-black/40 border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors" />
             </div>

             <div className="relative z-10 flex flex-col gap-2">
               <label className="text-sm font-semibold text-white/70">Message</label>
               <textarea required rows={4} placeholder="I want to upgrade my PG..." className="bg-black/40 border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors resize-none" />
             </div>

             <button type="submit" disabled={loading} className="relative z-10 mt-2 py-4 rounded-xl bg-white text-black font-bold hover:scale-[1.02] transition-transform duration-300 flex items-center justify-center gap-2 disabled:opacity-50">
               {loading ? "Sending..." : "Send Message"} <Send className="w-4 h-4" />
             </button>
           </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
