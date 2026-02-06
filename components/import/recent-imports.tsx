"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  FileText,
  Clock,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ImportError } from "./import-results";

export interface ImportHistoryRecord {
  id: string;
  type: "transactions" | "snapshots";
  filename: string;
  total: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
  createdAt: string;
}

interface RecentImportsProps {
  imports: ImportHistoryRecord[];
  isLoading?: boolean;
  className?: string;
}

const staggerContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const staggerItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function RecentImports({
  imports,
  isLoading = false,
  className,
}: RecentImportsProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card/50 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-muted animate-pulse mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <div className={cn("rounded-lg border border-border bg-card/50 p-8", className)}>
        <div className="flex flex-col items-center justify-center text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No imports yet</p>
          <p className="text-body-sm text-muted-foreground mt-1">
            Your import history will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={cn("space-y-3", className)}
      variants={reducedMotion ? undefined : staggerContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {imports.map((record) => {
        const hasErrors = record.errors.length > 0;
        const isExpanded = expandedId === record.id;
        const previewErrors = record.errors.slice(0, 3);

        return (
          <motion.div
            key={record.id}
            variants={reducedMotion ? undefined : staggerItemVariants}
            className="rounded-lg border border-border bg-card/50 overflow-hidden transition-colors duration-150 hover:bg-accent/5"
          >
            <div
              className={cn("p-4", hasErrors && "cursor-pointer")}
              onClick={() => hasErrors && toggleExpanded(record.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {hasErrors ? (
                      <AlertCircle className="h-5 w-5 text-warning" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-positive" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                        {record.filename}
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          record.type === "transactions"
                            ? "bg-accent/20 text-accent"
                            : "bg-positive/20 text-positive"
                        )}
                      >
                        {record.type === "transactions" ? "Transactions" : "Snapshots"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span className="text-positive">
                        {record.imported} imported
                      </span>
                      {record.skipped > 0 && (
                        <span className="text-warning">
                          {record.skipped} skipped
                        </span>
                      )}
                      {hasErrors && (
                        <span className="text-destructive">
                          {record.errors.length} error{record.errors.length === 1 ? "" : "s"}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(record.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                {hasErrors && (
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-muted-foreground shrink-0 mt-1"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Expandable details */}
            <AnimatePresence initial={false}>
              {isExpanded && hasErrors && (
                <motion.div
                  key="details"
                  initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-4 pb-4 border-t border-border">
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex gap-4">
                        <span>
                          <span className="text-foreground font-medium">{record.imported}</span> imported
                        </span>
                        <span>
                          <span className="text-foreground font-medium">{record.skipped}</span> skipped
                        </span>
                        <span>
                          <span className="text-foreground font-medium">{record.errors.length}</span> errors
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(record.createdAt), "PPpp")}
                      </div>
                    </div>

                    {previewErrors.length > 0 && (
                      <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                        {previewErrors.map((error, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 text-sm border-l-2 border-destructive pl-3"
                          >
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              Row {error.row}
                            </span>
                            <span className="text-destructive">{error.message}</span>
                          </div>
                        ))}
                        {record.errors.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-3">
                            ...and {record.errors.length - 3} more error{record.errors.length - 3 === 1 ? "" : "s"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
