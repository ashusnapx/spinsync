"use client";

export function RealTimeVector({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="50" cy="50" r="40" fill="url(#bg_grad1)" />
      <path d="M50 25V50L65 65" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="8" fill="#3B82F6" />
      <path d="M20 50A30 30 0 0 1 50 20" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" strokeDasharray="4 8" />
      <defs>
        <linearGradient id="bg_grad1" x1="10" y1="10" x2="90" y2="90">
          <stop stopColor="#3B82F6" stopOpacity="0.2" />
          <stop offset="1" stopColor="#2563EB" stopOpacity="0.8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function QueueVector({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="20" y="20" width="60" height="15" rx="7.5" fill="url(#bg_grad2)" />
      <rect x="30" y="45" width="50" height="15" rx="7.5" fill="url(#bg_grad2)" fillOpacity="0.6" />
      <rect x="40" y="70" width="40" height="15" rx="7.5" fill="url(#bg_grad2)" fillOpacity="0.3" />
      
      <circle cx="15" cy="27.5" r="5" fill="#A855F7" />
      <circle cx="25" cy="52.5" r="4" fill="#A855F7" fillOpacity="0.6" />
      <circle cx="35" cy="77.5" r="3" fill="#A855F7" fillOpacity="0.3" />
      <defs>
        <linearGradient id="bg_grad2" x1="20" y1="20" x2="80" y2="85">
          <stop stopColor="#A855F7" />
          <stop offset="1" stopColor="#7E22CE" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function QrVector({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="15" y="15" width="70" height="70" rx="12" fill="url(#bg_grad3)" fillOpacity="0.2" stroke="url(#bg_grad3)" strokeWidth="4" />
      <rect x="25" y="25" width="20" height="20" rx="4" fill="url(#bg_grad3)" />
      <rect x="25" y="55" width="20" height="20" rx="4" fill="url(#bg_grad3)" />
      <rect x="55" y="25" width="20" height="20" rx="4" fill="url(#bg_grad3)" />
      <rect x="55" y="55" width="10" height="10" rx="2" fill="url(#bg_grad3)" />
      <rect x="65" y="65" width="10" height="10" rx="2" fill="url(#bg_grad3)" />
      <defs>
        <linearGradient id="bg_grad3" x1="15" y1="15" x2="85" y2="85">
          <stop stopColor="#EC4899" />
          <stop offset="1" stopColor="#BE185D" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ChatVector({ className = "w-16 h-16" }: { className?: string }) {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M20 40C20 25 35 15 50 15C65 15 80 25 80 40C80 55 65 65 50 65C45 65 40 64 35 63L20 70L23 55C21 50 20 45 20 40Z" fill="url(#bg_grad4)" />
        <rect x="35" y="35" width="30" height="6" rx="3" fill="#FFFFFF" />
        <rect x="35" y="47" width="20" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.7" />
        <defs>
          <linearGradient id="bg_grad4" x1="20" y1="15" x2="80" y2="70">
            <stop stopColor="#10B981" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>
        </defs>
      </svg>
    );
}

export function ShieldVector({ className = "w-16 h-16" }: { className?: string }) {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M50 15L20 25V45C20 65 35 80 50 85C65 80 80 65 80 45V25L50 15Z" fill="url(#bg_grad5)" />
        <path d="M40 50L47 57L60 40" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="bg_grad5" x1="20" y1="15" x2="80" y2="85">
            <stop stopColor="#F59E0B" />
            <stop offset="1" stopColor="#B45309" />
          </linearGradient>
        </defs>
      </svg>
    );
}

export function TrophyVector({ className = "w-16 h-16" }: { className?: string }) {
    return (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M30 25H70L60 60H40L30 25Z" fill="url(#bg_grad6)" />
        <path d="M45 60V75M55 60V75M35 75H65" stroke="url(#bg_grad6)" strokeWidth="6" strokeLinecap="round" />
        <path d="M30 35H20C15 35 15 45 20 45H27" stroke="url(#bg_grad6)" strokeWidth="4" strokeLinecap="round" />
        <path d="M70 35H80C85 35 85 45 80 45H73" stroke="url(#bg_grad6)" strokeWidth="4" strokeLinecap="round" />
        <defs>
          <linearGradient id="bg_grad6" x1="20" y1="20" x2="80" y2="80">
            <stop stopColor="#06B6D4" />
            <stop offset="1" stopColor="#0369A1" />
          </linearGradient>
        </defs>
      </svg>
    );
}
