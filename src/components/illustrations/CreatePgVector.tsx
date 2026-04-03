"use client";

import { motion } from "framer-motion";

export function CreatePgVector() {
  return (
    <motion.div 
      className="relative w-full aspect-square"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
      <motion.svg 
        viewBox="0 0 400 400" 
        fill="none" 
        className="w-full h-full drop-shadow-2xl relative z-10"
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Glowing Building */}
        <path d="M120 300 V120 L200 60 L280 120 V300 Z" fill="url(#pg_grad)" fillOpacity="0.1" stroke="url(#pg_grad)" strokeWidth="4" />
        <rect x="140" y="220" width="40" height="40" rx="4" fill="url(#pg_grad)" fillOpacity="0.3" />
        <rect x="220" y="220" width="40" height="40" rx="4" fill="url(#pg_grad)" fillOpacity="0.3" />
        <rect x="140" y="140" width="40" height="40" rx="4" fill="url(#pg_grad)" />
        <rect x="220" y="140" width="40" height="40" rx="4" fill="url(#pg_grad)" fillOpacity="0.5" />
        
        {/* Door */}
        <path d="M180 300 V260 C180 250 220 250 220 260 V300" fill="url(#pg_grad)" stroke="url(#pg_grad)" strokeWidth="4" />
        
        {/* Map Marker Floating */}
        <motion.g 
          animate={{ y: [0, -15, 0] }} 
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          transform="translate(40, -40)"
        >
          <path d="M250 150 C250 130 290 130 290 150 C290 170 270 200 270 200 C270 200 250 170 250 150 Z" fill="#10B981" />
          <circle cx="270" cy="150" r="10" fill="#FFFFFF" />
        </motion.g>

        <defs>
          <linearGradient id="pg_grad" x1="120" y1="60" x2="280" y2="300">
            <stop stopColor="#10B981" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
        </defs>
      </motion.svg>
    </motion.div>
  );
}
