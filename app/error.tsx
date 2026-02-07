"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { AlertTriangle, ChevronDown, LayoutDashboard, RotateCcw } from "lucide-react";
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

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <AnimatedGradient variant="error" />

      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={staggerContainer}
        initial={shouldReduceMotion ? "visible" : "hidden"}
        animate="visible"
      >
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-8 text-center">
          {/* Icon */}
          <motion.div variants={shouldReduceMotion ? undefined : staggerItem} className="flex justify-center mb-6">
            <AlertTriangle className="h-16 w-16 text-destructive" />
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={shouldReduceMotion ? undefined : staggerItem}
            className="text-heading-lg text-foreground mb-3"
          >
            Something went wrong
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={shouldReduceMotion ? undefined : staggerItem}
            className="text-body-md text-muted-foreground mb-6"
          >
            An unexpected error occurred. Please try again or go back to the dashboard.
          </motion.p>

          {/* Dev-only collapsible details */}
          {process.env.NODE_ENV === "development" && error?.message && (
            <motion.div variants={shouldReduceMotion ? undefined : staggerItem} className="mb-6">
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="flex items-center gap-1.5 mx-auto text-body-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-expanded={detailsOpen}
                aria-controls="error-details"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    detailsOpen ? "rotate-180" : ""
                  }`}
                />
                Error details
              </button>
              {detailsOpen && (
                <div id="error-details" className="mt-3 bg-muted rounded-lg p-4 font-mono text-body-sm text-muted-foreground text-left break-all max-h-40 overflow-auto">
                  {error.message}
                </div>
              )}
            </motion.div>
          )}

          {/* Action buttons */}
          <motion.div
            variants={shouldReduceMotion ? undefined : staggerItem}
            className="flex items-center justify-center gap-3"
          >
            <Button onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
