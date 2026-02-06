"use client";

import * as React from "react";
import {
  motion,
  AnimatePresence,
  useSpring,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  Download,
  Check,
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

const errorStaggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03 },
  },
};

const errorStaggerItem = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
};

/** Generate a fix suggestion based on error message patterns */
export function generateSuggestion(message: string): string | undefined {
  const lower = message.toLowerCase();

  // Missing field pattern
  const missingMatch = lower.match(/missing (?:required )?(?:field|column|value)s?\s*(?:for\s+)?[:\s]*(.+)/i);
  if (missingMatch) {
    return `Ensure all rows have a value for ${missingMatch[1].trim()}`;
  }
  if (lower.includes("missing") || lower.includes("required")) {
    return "Ensure all required fields have values";
  }

  // Invalid format pattern
  if (lower.includes("invalid date") || lower.includes("date format")) {
    return "Expected format: YYYY-MM-DD (e.g., 2024-03-15)";
  }
  if (lower.includes("invalid number") || lower.includes("not a number") || lower.includes("numeric")) {
    return "Expected a numeric value (e.g., 95.50)";
  }
  if (lower.includes("invalid format") || lower.includes("format")) {
    return "Check the field format matches the expected pattern";
  }

  // Duplicate pattern
  if (lower.includes("duplicate") || lower.includes("already exists")) {
    return "This row matches an existing record — it will be skipped to prevent duplicates";
  }

  // Invalid value pattern
  const invalidMatch = lower.match(/invalid (?:value|action|type)[:\s]*['""]?(\w+)['""]?/i);
  if (invalidMatch) {
    return `Value "${invalidMatch[1]}" is not valid for this field`;
  }
  if (lower.includes("invalid")) {
    return "Check this value against the expected options";
  }

  // Unknown symbol
  if (lower.includes("unknown symbol") || lower.includes("symbol not found") || lower.includes("holding not found")) {
    return "Verify the symbol exists or add the holding first";
  }

  return undefined;
}

export function ImportResults({
  imported,
  skipped,
  errors,
  className,
}: ImportResultsProps) {
  // Collapsed by default if > 5 errors, expanded if <= 5
  const [isErrorsExpanded, setIsErrorsExpanded] = React.useState(() => errors.length > 0 && errors.length <= 5);
  const [downloadState, setDownloadState] = React.useState<"idle" | "success">("idle");
  const reducedMotion = useReducedMotion();
  const hasErrors = errors.length > 0;
  const isAllSuccess = imported > 0 && skipped === 0 && errors.length === 0;

  const handleDownloadErrors = React.useCallback(() => {
    // Build CSV content
    const header = "row_number,error_message,suggestion,original_data";
    const rows = errors.map((error) => {
      const suggestion = error.suggestion ?? generateSuggestion(error.message) ?? "";
      // Escape CSV fields
      const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
      return [error.row, escape(error.message), escape(suggestion), ""].join(",");
    });
    const csv = [header, ...rows].join("\n");

    // Generate filename
    const date = new Date().toISOString().split("T")[0];
    const filename = `import-errors-${date}.csv`;

    // Trigger download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success state
    setDownloadState("success");
    setTimeout(() => setDownloadState("idle"), 1500);
  }, [errors]);

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
              {isErrorsExpanded ? "Hide errors" : `Show ${errors.length} error${errors.length === 1 ? "" : "s"}`}
            </span>
            <motion.div
              animate={{ rotate: isErrorsExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </Button>

          <AnimatePresence initial={false}>
            {isErrorsExpanded && (
              <motion.div
                key="error-list"
                initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="mt-2 max-h-64 overflow-y-auto rounded-md bg-muted/50 p-3">
                  <motion.ul
                    className="space-y-2"
                    variants={reducedMotion ? undefined : errorStaggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {errors.map((error, index) => {
                      const suggestion = error.suggestion ?? generateSuggestion(error.message);
                      return (
                        <motion.li
                          key={index}
                          variants={reducedMotion ? undefined : errorStaggerItem}
                          className="flex items-start gap-2 text-sm border-l-2 border-destructive pl-3"
                        >
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Row {error.row}
                          </span>
                          <div>
                            <span className="text-destructive">{error.message}</span>
                            {suggestion && (
                              <p className="text-body-sm text-muted-foreground mt-0.5">
                                {suggestion}
                              </p>
                            )}
                          </div>
                        </motion.li>
                      );
                    })}
                  </motion.ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Download Error Report button */}
          <motion.div
            className="mt-3"
            animate={
              downloadState === "success" && !reducedMotion
                ? { scale: [1, 1.05, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadErrors}
              className={cn(
                "text-muted-foreground",
                downloadState === "success" && "text-positive border-positive/30"
              )}
            >
              {downloadState === "success" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloadState === "success" ? "Downloaded!" : "Download Error Report"}
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
