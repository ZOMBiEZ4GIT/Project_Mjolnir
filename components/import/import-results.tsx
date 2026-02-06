"use client";

import * as React from "react";
import {
  motion,
  useSpring,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ImportError {
  row: number;
  message: string;
  suggestion?: string;
}

export interface ImportResultsProps {
  imported: number;
  skipped: number;
  errors: ImportError[];
  className?: string;
}

/** Animated integer counter using Framer Motion spring */
function AnimatedCount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 100,
    damping: 20,
    duration: 0.6,
  });

  React.useEffect(() => {
    if (reducedMotion) {
      motionValue.jump(value);
    } else {
      motionValue.set(value);
    }
  }, [value, motionValue, reducedMotion]);

  React.useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.round(latest).toString();
      }
    });
    return unsubscribe;
  }, [spring]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {value}
    </span>
  );
}

const staggerContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function ImportResults({
  imported,
  skipped,
  errors,
  className,
}: ImportResultsProps) {
  const [isErrorsExpanded, setIsErrorsExpanded] = React.useState(false);
  const reducedMotion = useReducedMotion();
  const hasErrors = errors.length > 0;
  const isAllSuccess = imported > 0 && skipped === 0 && errors.length === 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Success banner */}
      {isAllSuccess && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex items-center gap-2 rounded-lg border border-positive/30 bg-positive/10 px-4 py-3"
        >
          <CheckCircle2 className="h-5 w-5 text-positive shrink-0" />
          <span className="text-sm font-medium text-positive">
            All rows imported successfully!
          </span>
        </motion.div>
      )}

      {/* Result cards */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        variants={reducedMotion ? undefined : staggerContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Imported card */}
        <motion.div
          variants={reducedMotion ? undefined : staggerItemVariants}
          className="flex flex-col items-center gap-2 rounded-lg bg-positive/10 p-3"
        >
          <CheckCircle2 className="h-5 w-5 text-positive" />
          <AnimatedCount
            value={imported}
            className="text-lg font-semibold text-positive"
          />
          <span className="text-xs text-muted-foreground">Imported</span>
        </motion.div>

        {/* Skipped card */}
        <motion.div
          variants={reducedMotion ? undefined : staggerItemVariants}
          className="flex flex-col items-center gap-2 rounded-lg bg-warning/10 p-3"
        >
          <AlertCircle className="h-5 w-5 text-warning" />
          <AnimatedCount
            value={skipped}
            className="text-lg font-semibold text-warning"
          />
          <span className="text-xs text-muted-foreground">Skipped</span>
        </motion.div>

        {/* Errors card */}
        <motion.div
          variants={reducedMotion ? undefined : staggerItemVariants}
          className="flex flex-col items-center gap-2 rounded-lg bg-destructive/10 p-3"
        >
          <XCircle className="h-5 w-5 text-destructive" />
          <AnimatedCount
            value={errors.length}
            className="text-lg font-semibold text-destructive"
          />
          <span className="text-xs text-muted-foreground">Errors</span>
        </motion.div>
      </motion.div>

      {/* Expandable error list */}
      {hasErrors && (
        <div className="border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsErrorsExpanded(!isErrorsExpanded)}
            className="w-full justify-between text-muted-foreground hover:text-foreground"
          >
            <span className="text-sm">
              {isErrorsExpanded ? "Hide" : "Show"} {errors.length} error{errors.length === 1 ? "" : "s"}
            </span>
            {isErrorsExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {isErrorsExpanded && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-md bg-muted/50 p-3">
              <ul className="space-y-2">
                {errors.map((error, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm border-l-2 border-destructive pl-3"
                  >
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Row {error.row}
                    </span>
                    <div>
                      <span className="text-destructive">{error.message}</span>
                      {error.suggestion && (
                        <p className="text-body-sm text-muted-foreground mt-0.5">
                          {error.suggestion}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
