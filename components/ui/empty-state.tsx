"use client";

import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

interface EmptyStateProps {
  /** Icon to display above the title */
  icon: LucideIcon;
  /** Main title for the empty state */
  title: string;
  /** Description text below the title */
  description: string;
  /** Optional call-to-action button or other content */
  action?: ReactNode;
}

/**
 * Consistent empty state component for list pages.
 * Displays an icon, title, description, and optional action.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[30vh] gap-4 text-center px-4"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
    >
      <div className="rounded-full bg-muted p-4 border border-border">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}
