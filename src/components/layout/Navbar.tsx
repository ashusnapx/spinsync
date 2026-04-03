"use client";

import Link from "next/link";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4 transition-all duration-300 ${
          scrolled 
            ? "border-b border-border bg-background/40 backdrop-blur-[20px] shadow-lg" 
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-primary-foreground font-black text-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(var(--primary),0.4)]">
              D
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">DhobiQ</span>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300">
              About Us
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300">
              Pricing
            </Link>
            <Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300">
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/auth/login"
              className="hidden sm:block px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Log In
            </Link>
            <Link
              href="/auth/signup"
              className="group hidden sm:flex relative px-6 py-2.5 text-sm font-bold bg-foreground text-background rounded-full overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(var(--primary),0.2)] items-center gap-2"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Free <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            
            <button 
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
               <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[80vw] max-w-sm bg-background border-l border-border z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-border">
                <span className="font-bold tracking-tight text-lg">Menu</span>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground bg-secondary/50 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col p-6 gap-6 overflow-y-auto">
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Navigation</span>
                  <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium hover:text-primary transition-colors">About Us</Link>
                  <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium hover:text-primary transition-colors">Pricing</Link>
                  <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium hover:text-primary transition-colors">Contact</Link>
                </div>
                
                <div className="h-px bg-border my-2" />
                
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</span>
                  <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium hover:text-primary transition-colors">Log In</Link>
                  <Link 
                    href="/auth/signup" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-4 text-center font-bold bg-primary text-primary-foreground rounded-xl mt-2 flex items-center justify-center gap-2"
                  >
                    Start Free <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              
              <div className="mt-auto p-6 bg-secondary/30 border-t border-border">
                <div className="flex items-center gap-3 justify-center mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-primary-foreground font-black text-sm">
                    D
                  </div>
                  <span className="font-bold tracking-tight text-foreground">DhobiQ</span>
                </div>
                <p className="text-xs text-center text-muted-foreground">© {new Date().getFullYear()} DhobiQ Inc.</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
