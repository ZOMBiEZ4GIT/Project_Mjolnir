"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : fadeIn.initial}
      animate={fadeIn.animate}
      transition={shouldReduceMotion ? { duration: 0 } : fadeIn.transition}
    >
      {children}
    </motion.div>
  );
}
