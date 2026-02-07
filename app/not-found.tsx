"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { LayoutDashboard, Briefcase, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedGradient } from "@/components/effects/animated-gradient";
import Link from "next/link";

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function NotFound() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <AnimatedGradient variant="auth" />

      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={staggerContainer}
        initial={shouldReduceMotion ? "visible" : "hidden"}
        animate="visible"
      >
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-8 text-center">
          {/* Decorative 404 */}
          <motion.div
            variants={shouldReduceMotion ? undefined : scaleIn}
            className="mb-4"
          >
            <span className="text-display-xl text-accent/30 select-none">404</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={shouldReduceMotion ? undefined : staggerItem}
            className="text-heading-lg text-foreground mb-3"
          >
            Page not found
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={shouldReduceMotion ? undefined : staggerItem}
            className="text-body-md text-muted-foreground mb-8"
          >
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </motion.p>

          {/* Navigation links */}
          <motion.div
            variants={shouldReduceMotion ? undefined : staggerItem}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button asChild>
              <Link href="/">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/holdings">
                <Briefcase className="mr-2 h-4 w-4" />
                View Holdings
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/transactions">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                View Transactions
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
