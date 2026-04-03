"use client";

import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { ArrowRight, Menu } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4 transition-all duration-300 ${
        scrolled 
          ? "border-b border-white/[0.08] bg-black/40 backdrop-blur-[20px] shadow-lg" 
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(124,58,237,0.4)]">
            S
          </div>
          <span className="text-xl font-bold tracking-tight">SpinSync</span>
        </Link>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/about" className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-300">
            About Us
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-300">
            Pricing
          </Link>
          <Link href="/contact" className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-300">
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="hidden sm:block px-5 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-colors duration-300"
          >
            Log In
          </Link>
          <Link
            href="/auth/signup"
            className="group relative px-6 py-2.5 text-sm font-bold bg-white text-black rounded-full overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center gap-2"
          >
            <span className="relative z-10 flex items-center gap-2">
              Start Free <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-300 to-violet-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          <button className="md:hidden p-2 text-white/70 hover:text-white">
             <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
