"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export interface CheckinStepperProps {
  currentStep: number; // 0-indexed
  steps?: string[];
}

const defaultSteps = ["Select Month", "Update Holdings", "Review & Save"];

export function CheckinStepper({
  currentStep,
  steps = defaultSteps,
}: CheckinStepperProps) {
  const reducedMotion = useReducedMotion();

  return (
    <nav aria-label="Check-in progress" className="w-full">
      <ol className="flex items-center justify-between">
        {steps.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li
              key={label}
              className="flex flex-1 items-center last:flex-none"
            >
              <div className="flex flex-col items-center gap-1.5">
                {/* Step circle */}
                <div className="relative">
                  <motion.div
                    className={`
                      flex h-8 w-8 items-center justify-center rounded-full
                      text-sm font-semibold transition-colors
                      ${
                        isCompleted
                          ? "bg-accent text-accent-foreground"
                          : isCurrent
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-muted-foreground"
                      }
                    `}
                    animate={
                      isCurrent && !reducedMotion
                        ? {
                            boxShadow: [
                              "0 0 0 0 hsl(var(--accent) / 0)",
                              "0 0 0 6px hsl(var(--accent) / 0.2)",
                              "0 0 0 0 hsl(var(--accent) / 0)",
                            ],
                          }
                        : undefined
                    }
                    transition={
                      isCurrent && !reducedMotion
                        ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                        : undefined
                    }
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </motion.div>
                </div>

                {/* Step label */}
                <span
                  className={`
                    text-xs text-center whitespace-nowrap
                    ${
                      isCompleted || isCurrent
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  `}
                >
                  {label}
                </span>
              </div>

              {/* Connection line (not after last step) */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 mb-5 self-start mt-4">
                  <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-accent"
                      initial={{ width: "0%" }}
                      animate={{
                        width: isCompleted ? "100%" : "0%",
                      }}
                      transition={
                        reducedMotion
                          ? { duration: 0 }
                          : { duration: 0.3, ease: "easeOut" }
                      }
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
