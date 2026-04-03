"use client";

import React, { useRef, useState } from "react";
import { HTMLMotionProps, motion, useMotionValue, useSpring, useTransform, AnimatePresence, useMotionTemplate } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  tiltMax?: number;
}

export function AnimatedCard({
  children,
  className,
  glow = true,
  tiltMax = 10,
  ...props
}: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseySpring = useSpring(y, { stiffness: 300, damping: 20 });

  const rotateX = useTransform(mouseySpring, [-0.5, 0.5], [tiltMax, -tiltMax]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-tiltMax, tiltMax]);
  
  const bgX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const bgY = useTransform(mouseySpring, [-0.5, 0.5], ["0%", "100%"]);
  const glowBackground = useMotionTemplate`radial-gradient(400px circle at ${bgX} ${bgY}, rgba(0, 212, 255, 0.15), transparent 40%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-colors duration-300",
        isHovered ? "bg-white/10 border-white/20" : "",
        className
      )}
      {...props}
    >
      {glow && (
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300"
              style={{
                background: glowBackground,
              }}
            />
          )}
        </AnimatePresence>
      )}
      <div
        style={{ transform: "translateZ(30px)" }}
        className="relative z-10 w-full h-full"
      >
        {children}
      </div>
    </motion.div>
  );
}
