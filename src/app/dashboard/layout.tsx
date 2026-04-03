"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";
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
  const supabase = createSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isPending, setIsPending] = useState(true);
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsPending(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Fallback to login if somehow here without session
  useEffect(() => {
    if (!isPending && !session) {
      if (typeof window !== "undefined") window.location.href = "/auth/login";
    }
  }, [session, isPending]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden font-sans">
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur-xl z-40 flex items-center justify-between px-6">
        <div className="font-bold text-lg flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-primary-foreground font-black">D</div>
          DhobiQ
        </div>
        <button onClick={() => setSidebarOpen(true)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground relative z-50">
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : (typeof window !== "undefined" && window.innerWidth < 1024 ? -320 : 0) }}
        transition={{ type: "spring", damping: 24, stiffness: 200 }}
        className="fixed top-0 bottom-0 left-0 w-72 bg-card border-r border-border z-50 flex flex-col pt-16 lg:pt-0"
      >
        <div className="absolute top-4 right-4 lg:hidden">
          <button onClick={() => setSidebarOpen(false)} className="p-2 text-muted-foreground hover:text-foreground bg-secondary/50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-primary-foreground font-black text-xl shadow-[0_0_20px_rgba(var(--primary),0.2)]">D</div>
            <div>
              <div className="font-bold tracking-tight text-lg text-foreground">DhobiQ</div>
              <div className="text-xs text-primary font-medium">Sunny Meadows PG</div>
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
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-secondary border border-border rounded-xl"
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  />
                )}
                <link.icon className={cn("w-5 h-5 relative z-10 transition-colors", isActive ? "text-primary" : "group-hover:text-primary")} />
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-orange-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-sm truncate text-foreground">{session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0]}</div>
              <div className="text-xs text-muted-foreground truncate">{session?.user?.email}</div>
            </div>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth/login";
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text- rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors w-full text-left"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-72 flex flex-col min-h-screen relative pt-16 lg:pt-0">
        {/* Decorative background glow for main content */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[300px] bg-primary/5 blur-[120px] pointer-events-none" />
        
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
