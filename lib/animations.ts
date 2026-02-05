import type { Variants, Transition } from "framer-motion";

// ---------------------------------------------------------------------------
// Transition presets
// ---------------------------------------------------------------------------

export const springTransition: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 15,
};

const easeOutTransition: Transition = {
  duration: 0.3,
  ease: "easeOut",
};

// ---------------------------------------------------------------------------
// Animation presets — spread onto <motion.div {...fadeIn} />
// ---------------------------------------------------------------------------

/** Simple opacity fade (0.2 s) */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 } satisfies Transition,
} as const;

/** Slide up with fade (0.3 s ease-out) */
export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: easeOutTransition,
} as const;

/** Scale in from 0.95 with fade (0.2 s) */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 } satisfies Transition,
} as const;

// ---------------------------------------------------------------------------
// Stagger presets (use as Variants for parent + children)
// ---------------------------------------------------------------------------

/** Parent container — staggers children by 0.05 s */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

/** Child item — fades and slides up */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// ---------------------------------------------------------------------------
// Number spring — for animated counters (net worth hero, etc.)
// ---------------------------------------------------------------------------

/** Spring config for animating numeric values */
export const numberSpring: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 15,
};
