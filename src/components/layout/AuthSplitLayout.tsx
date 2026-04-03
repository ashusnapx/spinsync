"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import React from "react";

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  vectorNode: React.ReactNode;
}

export function AuthSplitLayout({ children, title, subtitle, vectorNode }: AuthSplitLayoutProps) {
  return (
    <div className="relative min-h-screen flex text-foreground overflow-hidden bg-background font-sans">
      
      {/* Visual / Art Side (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-1 relative flex-col justify-between p-12 overflow-hidden z-10 border-r border-border bg-card/50 backdrop-blur-3xl">
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
        
        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl xl:text-5xl font-black mb-6 tracking-tight leading-tight">
              {title.split(' ').map((word, i) => (
                <React.Fragment key={i}>
                  {i === title.split(' ').length - 2 ? (
                    <>
                      <br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">
                        {word}{' '}
                      </span>
                    </>
                  ) : i === title.split(' ').length - 1 ? (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-400">
                      {word}
                    </span>
                  ) : (
                    word + ' '
                  )}
                </React.Fragment>
              ))}
            </h1>
            <p className="text-muted-foreground text-lg font-light leading-relaxed">
              {subtitle}
            </p>
          </motion.div>
        </div>

        {/* Dynamic Vector Artwork */}
        <div className="absolute right-[-10%] top-[40%] transform -translate-y-1/2 w-[80%] max-w-[500px]">
          {vectorNode}
        </div>
        
        {/* Abstract decorative elements */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full border border-border bg-gradient-to-tr from-primary/10 to-transparent blur-3xl opacity-50" />
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24 z-10 relative bg-background">
        <div className="lg:hidden absolute top-6 left-6 z-20">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
        </div>
        
        <motion.div 
          className="w-full max-w-md mx-auto"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ease: "easeOut", duration: 0.5 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
