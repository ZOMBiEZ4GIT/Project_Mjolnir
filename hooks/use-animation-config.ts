"use client";

import { useReducedMotion } from "framer-motion";
import type { Transition } from "framer-motion";
import { fadeIn } from "@/lib/animations";

/**
 * Animation props returned by useAnimationConfig.
 * Spread onto a motion element: `<motion.div {...animationProps} />`
 */
export interface AnimationProps {
  initial: Record<string, unknown> | false;
  animate: Record<string, unknown>;
  exit?: Record<string, unknown>;
  transition: Transition;
}

/** A preset shape matching the animation objects in lib/animations.ts */
interface AnimationPreset {
  readonly initial: Record<string, unknown>;
  readonly animate: Record<string, unknown>;
  readonly exit?: Record<string, unknown>;
  readonly transition: Transition;
}

/**
 * Returns animation props that respect the user's prefers-reduced-motion
 * OS setting. When reduced motion is enabled, animations are effectively
 * disabled (initial: false, duration: 0). Otherwise the supplied preset
 * (or the default fadeIn) is returned.
 *
 * The hook re-evaluates on every render via Framer Motion's
 * useReducedMotion, which listens to matchMedia changes.
 *
 * @param preset - An animation preset from lib/animations.ts (default: fadeIn)
 */
export function useAnimationConfig(
  preset?: AnimationPreset,
): AnimationProps {
  const shouldReduceMotion = useReducedMotion();
  const source = preset ?? fadeIn;

  if (shouldReduceMotion) {
    return {
      initial: false,
      animate: source.animate,
      exit: source.exit,
      transition: { duration: 0 },
    };
  }

  return {
    initial: source.initial as Record<string, unknown>,
    animate: source.animate as Record<string, unknown>,
    exit: source.exit as Record<string, unknown>,
    transition: source.transition,
  };
}
