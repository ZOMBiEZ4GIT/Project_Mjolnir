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
// Reduced-motion helper
// ---------------------------------------------------------------------------

/** Returns a duration of 0 if reduced motion is preferred, otherwise the given duration */
const rm = (duration: number) => duration;
const rmTransition = (t: Transition): Transition => t;

/**
 * Create animation presets that respect prefers-reduced-motion.
 * Usage: wrap your preset transitions with `reducedMotion(transition)`.
 * At runtime, use `useReducedMotion()` from framer-motion and conditionally
 * apply `transition: { duration: 0 }` or use the `reducedMotionOverride` export.
 */
export const reducedMotionOverride = {
  transition: { duration: 0 },
} as const;

// ---------------------------------------------------------------------------
// Animation presets — spread onto <motion.div {...fadeIn} />
// ---------------------------------------------------------------------------

/** Simple opacity fade (0.2 s) */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: rm(0.2) } satisfies Transition,
} as const;

/** Slide up with fade (0.3 s ease-out) */
export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: rmTransition(easeOutTransition),
} as const;

/** Scale in from 0.95 with fade (0.2 s) */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: rm(0.2) } satisfies Transition,
} as const;

// ---------------------------------------------------------------------------
// Modal animation presets
// ---------------------------------------------------------------------------

/** Modal enter — scale 0.95→1 + opacity 0→1, 200ms */
export const modalScale = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: rm(0.2), ease: "easeOut" } satisfies Transition,
} as const;

/** Modal exit — scale 1→0.95 + opacity 1→0, 150ms */
export const modalExit = {
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: rm(0.15), ease: "easeIn" } satisfies Transition,
} as const;

/** Combined modal animation — spread for enter + exit */
export const modalAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: rm(0.2), ease: "easeOut" } satisfies Transition,
} as const;

// ---------------------------------------------------------------------------
// Sheet / drawer animation presets
// ---------------------------------------------------------------------------

/** Sheet slide from left — x -100%→0 + opacity 0→1, 300ms */
export const sheetSlide = {
  initial: { opacity: 0, x: "-100%" },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: "-100%" },
  transition: { duration: rm(0.3), ease: "easeOut" } satisfies Transition,
} as const;

/** Sheet slide from right — x 100%→0 + opacity 0→1, 300ms */
export const sheetSlideRight = {
  initial: { opacity: 0, x: "100%" },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: "100%" },
  transition: { duration: rm(0.3), ease: "easeOut" } satisfies Transition,
} as const;

// ---------------------------------------------------------------------------
// Error shake preset
// ---------------------------------------------------------------------------

/** Error shake keyframes — x [0, -8, 8, -4, 4, 0], 400ms */
export const errorShake = {
  animate: {
    x: [0, -8, 8, -4, 4, 0],
  },
  transition: { duration: rm(0.4), ease: "easeInOut" } satisfies Transition,
} as const;

// ---------------------------------------------------------------------------
// Focus glow preset
// ---------------------------------------------------------------------------

/** Focus glow — boxShadow transition, 150ms */
export const focusGlow = {
  whileFocus: {
    boxShadow: "0 0 0 2px rgba(139, 92, 246, 0.4)",
  },
  transition: { duration: rm(0.15) } satisfies Transition,
} as const;

// ---------------------------------------------------------------------------
// Accordion animation presets
// ---------------------------------------------------------------------------

/** Accordion expand — height 0→auto + opacity 0→1, 200ms */
export const accordionExpand: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: "hidden" },
  expanded: {
    height: "auto",
    opacity: 1,
    overflow: "hidden",
    transition: { duration: rm(0.2), ease: "easeOut" },
  },
};

/** Accordion collapse — height auto→0 + opacity 1→0, 150ms */
export const accordionCollapse: Variants = {
  expanded: {
    height: "auto",
    opacity: 1,
    overflow: "hidden",
    transition: { duration: rm(0.15), ease: "easeIn" },
  },
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: "hidden",
    transition: { duration: rm(0.15), ease: "easeIn" },
  },
};

/** Combined accordion animation variants */
export const accordionAnimation: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: "hidden" },
  expanded: {
    height: "auto",
    opacity: 1,
    overflow: "hidden",
    transition: { duration: rm(0.2), ease: "easeOut" },
  },
};

// ---------------------------------------------------------------------------
// Checkmark animation preset
// ---------------------------------------------------------------------------

/** Checkmark — pathLength 0→1 + scale 0→1, spring physics */
export const checkmark = {
  initial: { pathLength: 0, scale: 0 },
  animate: { pathLength: 1, scale: 1 },
  transition: {
    pathLength: { type: "spring", stiffness: 300, damping: 20 },
    scale: { type: "spring", stiffness: 200, damping: 15 },
  } satisfies Transition,
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
