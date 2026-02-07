"use client";

import { cn } from "@/lib/utils";

interface HeroBeamsProps {
  className?: string;
}

/**
 * Subtle beam effect for the hero card background.
 * 3-5 thin semi-transparent accent-purple beams that drift upward and fade.
 * Uses CSS @keyframes with transform + opacity only for GPU acceleration.
 * Respects prefers-reduced-motion via global CSS rule.
 */
export function HeroBeams({ className }: HeroBeamsProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-2xl",
        className
      )}
      aria-hidden="true"
    >
      {/* Beam 1 — left side, slow */}
      <div className="absolute bottom-0 left-[15%] h-full w-px bg-gradient-to-t from-transparent via-purple-500/12 to-transparent animate-beam-drift-1" />
      {/* Beam 2 — centre-left, medium */}
      <div className="absolute bottom-0 left-[35%] h-full w-px bg-gradient-to-t from-transparent via-purple-400/10 to-transparent animate-beam-drift-2" />
      {/* Beam 3 — centre, slow */}
      <div className="absolute bottom-0 left-[50%] h-full w-[2px] bg-gradient-to-t from-transparent via-purple-500/15 to-transparent animate-beam-drift-3" />
      {/* Beam 4 — centre-right, medium */}
      <div className="absolute bottom-0 left-[68%] h-full w-px bg-gradient-to-t from-transparent via-purple-400/10 to-transparent animate-beam-drift-4" />
      {/* Beam 5 — right side, slow */}
      <div className="absolute bottom-0 left-[85%] h-full w-px bg-gradient-to-t from-transparent via-purple-500/12 to-transparent animate-beam-drift-5" />
    </div>
  );
}
