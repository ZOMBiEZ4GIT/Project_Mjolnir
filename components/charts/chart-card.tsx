"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

interface ChartCardProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable chart wrapper providing consistent card styling, title, and entrance animation.
 */
export function ChartCard({ title, actions, children, className = "" }: ChartCardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`rounded-2xl glass-card p-4 sm:p-6 ${className}`}
      {...(reducedMotion ? {} : fadeIn)}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h3 className="text-label uppercase text-muted-foreground">{title}</h3>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      {children}
    </motion.div>
  );
}
