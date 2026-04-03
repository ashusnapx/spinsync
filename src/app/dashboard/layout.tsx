"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "@/lib/auth-client";
import { 
  Menu, X, Home, WashingMachine, ListChecks, 
  MessageSquare, UserCircle, LogOut, Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dummy PG Name for preview, in real app fetch via org
const navLinks = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/machines", label: "Machines", icon: WashingMachine },
  { href: "/dashboard/queue", label: "Live Queue", icon: ListChecks },
  { href: "/dashboard/chat", label: "Community", icon: MessageSquare },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Fallback to login if somehow here without session (Middleware handles this, but safe fallback)
  if (!session) {
    if (typeof window !== "undefined") window.location.href = "/auth/login";
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex overflow-hidden font-sans">
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-black/50 backdrop-blur-xl z-40 flex items-center justify-between px-6">
        <div className="font-bold text-lg flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-black">S</div>
          SpinSync
        </div>
        <button onClick={() => setSidebarOpen(true)} className="p-2 -mr-2 text-white/70 hover:text-white relative z-50">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : (typeof window !== "undefined" && window.innerWidth < 1024 ? -320 : 0) }}
        transition={{ type: "spring", damping: 24, stiffness: 200 }}
        className="fixed top-0 bottom-0 left-0 w-72 bg-[#12121a] border-r border-white/5 z-50 flex flex-col pt-16 lg:pt-0"
      >
        <div className="absolute top-4 right-4 lg:hidden">
          <button onClick={() => setSidebarOpen(false)} className="p-2 text-white/50 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(0,212,255,0.2)]">S</div>
            <div>
              <div className="font-bold tracking-tight text-lg">SpinSync</div>
              <div className="text-xs text-cyan-400 font-medium">Sunny Meadows PG</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group relative",
                  isActive ? "text-white" : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  />
                )}
                <link.icon className={cn("w-5 h-5 relative z-10 transition-colors", isActive ? "text-cyan-400" : "group-hover:text-cyan-400")} />
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-orange-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{session.user.name}</div>
              <div className="text-xs text-white/40 truncate">{session.user.email}</div>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              window.location.href = "/auth/login";
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors w-full text-left"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-72 flex flex-col min-h-screen relative pt-16 lg:pt-0">
        {/* Decorative background glow for main content */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[300px] bg-cyan-500/10 blur-[120px] pointer-events-none" />
        
        <div className="flex-1 p-6 md:p-10 lg:p-12 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full max-w-6xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
