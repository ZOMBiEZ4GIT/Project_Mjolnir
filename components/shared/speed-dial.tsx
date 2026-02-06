"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Wallet, ArrowRightLeft, Camera } from "lucide-react";
import { useReducedMotion } from "framer-motion";

export interface SpeedDialAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface SpeedDialProps {
  actions?: SpeedDialAction[];
}

const defaultActions: Omit<SpeedDialAction, "onClick">[] = [
  { id: "add-holding", label: "Add Holding", icon: <Wallet className="h-4 w-4" /> },
  { id: "add-transaction", label: "Add Transaction", icon: <ArrowRightLeft className="h-4 w-4" /> },
  { id: "monthly-check-in", label: "Monthly Check-in", icon: <Camera className="h-4 w-4" /> },
];

export function SpeedDial({ actions }: SpeedDialProps) {
  const [isOpen, setIsOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const resolvedActions = actions ?? [];

  // Use default icons/labels if actions match default IDs
  const displayActions = resolvedActions.map((action) => {
    const defaultAction = defaultActions.find((d) => d.id === action.id);
    return {
      ...action,
      label: action.label || defaultAction?.label || action.id,
      icon: action.icon || defaultAction?.icon,
    };
  });

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  const duration = reducedMotion ? 0 : 0.2;
  const staggerDelay = reducedMotion ? 0 : 0.05;

  return (
    <div className="hidden sm:block fixed bottom-6 right-6 z-40">
      {/* Backdrop overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="absolute bottom-16 right-0 flex flex-col-reverse items-end gap-3">
        <AnimatePresence>
          {isOpen &&
            displayActions.map((action, index) => (
              <motion.button
                key={action.id}
                className="flex items-center gap-3 rounded-full bg-card border border-border pl-4 pr-3 py-2.5 shadow-lg hover:bg-muted transition-colors cursor-pointer"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{
                  duration,
                  delay: staggerDelay * index,
                }}
                onClick={() => {
                  action.onClick();
                  close();
                }}
              >
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {action.label}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  {action.icon}
                </span>
              </motion.button>
            ))}
        </AnimatePresence>
      </div>

      {/* Main FAB button */}
      <motion.button
        className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg hover:shadow-glow-sm transition-shadow cursor-pointer"
        onClick={toggle}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration }}
      >
        <Plus className="h-6 w-6" />
      </motion.button>
    </div>
  );
}
