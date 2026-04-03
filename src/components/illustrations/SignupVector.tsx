"use client";

import { motion } from "framer-motion";

export function SignupVector() {
  return (
    <motion.div 
      className="relative w-full aspect-[4/3]"
      initial={{ opacity: 0, rotateY: 30 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-violet-500/20 blur-[100px] rounded-full" />
      <motion.svg 
        viewBox="0 0 500 400" 
        fill="none" 
        className="w-full h-full drop-shadow-2xl relative z-10"
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Floating ID Card */}
        <rect x="100" y="100" width="300" height="200" rx="24" fill="#1A1A24" stroke="url(#signup_grad)" strokeWidth="4" />
        <rect x="100" y="100" width="300" height="200" rx="24" fill="url(#signup_grad)" fillOpacity="0.05" />
        
        {/* Avatar Placeholder */}
        <circle cx="170" cy="200" r="40" fill="url(#signup_grad)" />
        <circle cx="170" cy="190" r="15" fill="#FFFFFF" fillOpacity="0.8" />
        <path d="M145 220 C145 200 195 200 195 220" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeOpacity="0.8" />

        {/* Lines */}
        <rect x="230" y="160" width="120" height="12" rx="6" fill="#FFFFFF" fillOpacity="0.8" />
        <rect x="230" y="190" width="80" height="8" rx="4" fill="#FFFFFF" fillOpacity="0.4" />
        <rect x="230" y="210" width="100" height="8" rx="4" fill="#FFFFFF" fillOpacity="0.4" />
        <rect x="230" y="230" width="60" height="8" rx="4" fill="#FFFFFF" fillOpacity="0.4" />

        {/* Abstract Background Network */}
        <path d="M300 50 L350 100 L400 70" stroke="url(#signup_grad)" strokeWidth="3" strokeDasharray="5 5" />
        <circle cx="350" cy="100" r="5" fill="#8B5CF6" />
        <path d="M100 300 L50 350 L100 380" stroke="url(#signup_grad)" strokeWidth="3" strokeDasharray="5 5" />
        <circle cx="50" cy="350" r="5" fill="#EC4899" />

        <defs>
          <linearGradient id="signup_grad" x1="100" y1="100" x2="400" y2="300">
            <stop stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </motion.svg>
    </motion.div>
  );
}
