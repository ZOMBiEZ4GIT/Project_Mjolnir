"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_PREVIEW_ROWS = 10;

export interface ImportPreviewProps {
  /** Column headers from the CSV */
  headers: string[];
  /** All parsed rows as string arrays */
  rows: string[][];
  /** Validation warnings (e.g. missing fields) */
  warnings?: string[];
  /** Called when user confirms import */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether import is in progress */
  isLoading?: boolean;
  /** Label for the import type (e.g. "Transactions", "Snapshots") */
  importType?: string;
}

export function ImportPreview({
  headers,
  rows,
  warnings,
  onConfirm,
  onCancel,
  isLoading = false,
  importType = "Rows",
}: ImportPreviewProps) {
  const reducedMotion = useReducedMotion();
  const totalRows = rows.length;
  const previewRows = rows.slice(0, MAX_PREVIEW_ROWS);
  const remainingRows = totalRows - MAX_PREVIEW_ROWS;
  const hasWarnings = warnings && warnings.length > 0;

  // Capped stagger: max 300ms total
  const staggerDelay = Math.min(0.03, 0.3 / previewRows.length);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: staggerDelay },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, x: 30 }}
      animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: "easeOut" as const }}
      className="space-y-4"
    >
      {/* Row count */}
      <p className="text-sm font-medium text-foreground">
        {totalRows} row{totalRows === 1 ? "" : "s"} ready to import
      </p>

      {/* Warning banner */}
      {hasWarnings && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-warning">
                {w}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Preview table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <motion.tbody
            variants={reducedMotion ? undefined : containerVariants}
            initial="hidden"
            animate="visible"
          >
            {previewRows.map((row, rowIdx) => (
              <motion.tr
                key={rowIdx}
                variants={reducedMotion ? undefined : rowVariants}
                className={cn(
                  "border-b border-border last:border-b-0",
                  rowIdx % 2 === 0 ? "bg-card" : "bg-card/50"
                )}
              >
                {headers.map((_, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-3 py-2 text-foreground whitespace-nowrap max-w-[200px] truncate"
                  >
                    {row[colIdx] ?? ""}
                  </td>
                ))}
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>

      {/* "...and X more rows" */}
      {remainingRows > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          ...and {remainingRows} more row{remainingRows === 1 ? "" : "s"}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Import {totalRows} {importType}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}
