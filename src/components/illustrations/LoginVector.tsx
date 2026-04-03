"use client";

import { motion } from "framer-motion";

export function LoginVector() {
  return (
    <motion.div 
      className="relative w-full aspect-square"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
      <motion.svg 
        viewBox="0 0 400 400" 
        fill="none" 
        className="w-full h-full drop-shadow-2xl relative z-10"
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Shield Backing */}
        <path d="M200 50 L100 90 V180 C100 270 180 330 200 350 C220 330 300 270 300 180 V90 L200 50Z" fill="url(#login_grad)" fillOpacity="0.1" stroke="url(#login_grad)" strokeWidth="4" />
        
        {/* Glowing Lock Body */}
        <rect x="150" y="180" width="100" height="80" rx="16" fill="url(#login_grad)" />
        <path d="M170 180 V140 C170 120 230 120 230 140 V180" stroke="url(#login_grad)" strokeWidth="16" strokeLinecap="round" />
        <circle cx="200" cy="220" r="10" fill="#FFFFFF" />
        <path d="M200 220 V240" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />

        <defs>
          <linearGradient id="login_grad" x1="100" y1="50" x2="300" y2="350">
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </motion.svg>
    </motion.div>
  );
}
