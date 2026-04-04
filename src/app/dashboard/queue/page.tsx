"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock3, WashingMachine } from "lucide-react";

import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { buttonVariants } from "@/components/ui/button";
import { fadeUp } from "@/components/ui/Animations";
import { cn } from "@/lib/utils";

export default function QueuePage() {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-3xl"
    >
      <AnimatedCard className="p-8 md:p-10">
        <div className="flex flex-col gap-6 text-center md:text-left">
          <div className="flex justify-center md:justify-start">
            <div className="rounded-2xl bg-primary/10 p-4 text-primary">
              <Clock3 className="size-8" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Live Queue is disabled for now
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Queueing and gamified priority are paused in the current rollout.
              We are focusing on core machine controls, tenant management, and
              community chat first.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/machines"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <WashingMachine className="size-4" />
              Go to Machines
            </Link>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </AnimatedCard>
    </motion.div>
  );
}
