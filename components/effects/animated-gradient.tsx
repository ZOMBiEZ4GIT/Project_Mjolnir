"use client";

import { cn } from "@/lib/utils";

type AnimatedGradientVariant = "auth" | "error";

interface AnimatedGradientProps {
  variant: AnimatedGradientVariant;
  className?: string;
}

const gradients: Record<AnimatedGradientVariant, string> = {
  auth: "from-purple-900/30 via-indigo-950/20 to-blue-950/30",
  error: "from-red-950/30 via-rose-950/20 to-red-900/30",
};

export function AnimatedGradient({ variant, className }: AnimatedGradientProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-0 opacity-40",
        className
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br animate-gradient-shift bg-[length:200%_200%]",
          gradients[variant]
        )}
      />
    </div>
  );
}
