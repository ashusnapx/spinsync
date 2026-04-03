"use client";

import { motion } from "framer-motion";

export function HeroAppVector({ className }: { className?: string }) {
  return (
    <motion.div 
      className={`relative w-full max-w-[500px] aspect-[4/5] ${className}`}
      initial={{ opacity: 0, y: 40, rotateX: 20, rotateY: -10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
    >
      {/* Decorative Glows */}
      <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-cyan-500/30 rounded-full blur-[80px]" />
      <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-violet-500/30 rounded-full blur-[80px]" />

      {/* Main Phone/Dashboard Device Shape */}
      <motion.div 
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 z-10"
      >
        <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
          
          {/* Device Frame */}
          <rect x="50" y="20" width="300" height="460" rx="40" fill="#12121A" stroke="url(#frame_gradient)" strokeWidth="4"/>
          <rect x="52" y="22" width="296" height="456" rx="38" fill="url(#glass_gradient)" />
          
          {/* Inner Screen */}
          <rect x="60" y="30" width="280" height="440" rx="32" fill="#0A0A0F" />
          
          {/* App Header */}
          <circle cx="95" cy="65" r="15" fill="url(#avatar_gradient)" />
          <rect x="120" y="55" width="80" height="8" rx="4" fill="#FFFFFF" fillOpacity="0.8" />
          <rect x="120" y="70" width="40" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.4" />
          
          {/* Status Badge */}
          <rect x="260" y="55" width="50" height="20" rx="10" fill="#10B981" fillOpacity="0.1" />
          <circle cx="272" cy="65" r="4" fill="#10B981" />
          <rect x="282" y="62" width="20" height="6" rx="3" fill="#10B981" />

          {/* Machine Card 1 (Hovering out slightly) */}
          <g transform="translate(70, 110)">
            <rect x="0" y="0" width="260" height="100" rx="16" fill="#FFFFFF" fillOpacity="0.05" stroke="#FFFFFF" strokeOpacity="0.1" />
            <circle cx="35" cy="35" r="20" fill="url(#avatar_gradient)" fillOpacity="0.2" />
            <path d="M35 25V45M25 35H45" stroke="#00D4FF" strokeWidth="3" strokeLinecap="round" />
            <rect x="70" y="25" width="120" height="8" rx="4" fill="#FFFFFF" fillOpacity="0.9" />
            <rect x="70" y="40" width="60" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.5" />
            
            {/* Progress Bar */}
            <rect x="20" y="75" width="220" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.1" />
            <rect x="20" y="75" width="140" height="6" rx="3" fill="#00D4FF" />
          </g>

          {/* Machine Card 2 */}
          <g transform="translate(70, 230)">
            <rect x="0" y="0" width="260" height="100" rx="16" fill="#FFFFFF" fillOpacity="0.03" stroke="#FFFFFF" strokeOpacity="0.05" />
            <circle cx="35" cy="35" r="20" fill="#F43F5E" fillOpacity="0.1" />
            <path d="M28 28L42 42M42 28L28 42" stroke="#F43F5E" strokeWidth="3" strokeLinecap="round" />
            <rect x="70" y="25" width="100" height="8" rx="4" fill="#FFFFFF" fillOpacity="0.7" />
            <rect x="70" y="40" width="80" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.3" />
            
            <rect x="20" y="75" width="220" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.1" />
            <rect x="20" y="75" width="200" height="6" rx="3" fill="#F43F5E" />
          </g>

          {/* Queue Card */}
          <g transform="translate(70, 350)">
            <rect x="0" y="0" width="260" height="80" rx="16" fill="url(#queue_gradient)" stroke="#7C3AED" strokeOpacity="0.3" />
            <rect x="20" y="20" width="100" height="10" rx="5" fill="#FFFFFF" fillOpacity="0.9" />
            <rect x="20" y="40" width="180" height="8" rx="4" fill="#FFFFFF" fillOpacity="0.6" />
            <circle cx="230" cy="40" r="15" fill="#7C3AED" fillOpacity="0.8" />
            <path d="M225 40L232 35V45L225 40Z" fill="#FFFFFF" />
          </g>

          <defs>
            <linearGradient id="frame_gradient" x1="50" y1="20" x2="350" y2="480" gradientUnits="userSpaceOnUse">
              <stop stopColor="#333333" />
              <stop offset="0.5" stopColor="#1A1A1A" />
              <stop offset="1" stopColor="#555555" />
            </linearGradient>
            
            <linearGradient id="glass_gradient" x1="50" y1="20" x2="350" y2="480" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" stopOpacity="0.1" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="avatar_gradient" x1="80" y1="50" x2="110" y2="80" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00D4FF" />
              <stop offset="1" stopColor="#7C3AED" />
            </linearGradient>

            <linearGradient id="queue_gradient" x1="70" y1="350" x2="330" y2="430" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7C3AED" stopOpacity="0.1" />
              <stop offset="1" stopColor="#00D4FF" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Floating UI Elements for depth */}
      <motion.div 
        animate={{ y: [10, -10, 10] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -right-12 top-32 z-20"
      >
        <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
          <rect x="0" y="0" width="120" height="100" rx="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" style={{ backdropFilter: "blur(20px)" }} />
          <circle cx="60" cy="40" r="16" fill="#10B981" fillOpacity="0.2" />
          <path d="M54 40L58 44L66 36" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="30" y="70" width="60" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.8" />
          <rect x="40" y="82" width="40" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.4" />
        </svg>
      </motion.div>

      <motion.div 
        animate={{ y: [-15, 15, -15] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute -left-16 bottom-24 z-20"
      >
        <svg width="140" height="80" viewBox="0 0 140 80" fill="none">
          <rect x="0" y="0" width="140" height="80" rx="20" fill="url(#floating_grad)" stroke="rgba(0,212,255,0.4)" style={{ backdropFilter: "blur(20px)" }} />
          <circle cx="30" cy="40" r="12" fill="#FFFFFF" />
          <circle cx="30" cy="40" r="6" fill="#00D4FF" />
          <rect x="55" y="30" width="60" height="8" rx="4" fill="#FFFFFF" />
          <rect x="55" y="45" width="40" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.6" />
          <defs>
            <linearGradient id="floating_grad" x1="0" y1="0" x2="140" y2="80">
              <stop stopColor="rgba(0,212,255,0.1)" />
              <stop offset="1" stopColor="rgba(124,58,237,0.1)" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
    </motion.div>
  );
}
