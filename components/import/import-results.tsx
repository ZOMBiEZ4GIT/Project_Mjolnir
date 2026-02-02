"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportResultsProps {
  imported: number;
  skipped: number;
  errors: ImportError[];
  className?: string;
}

export function ImportResults({
  imported,
  skipped,
  errors,
  className,
}: ImportResultsProps) {
  const [isErrorsExpanded, setIsErrorsExpanded] = React.useState(false);
  const hasErrors = errors.length > 0;
  const isSuccess = imported > 0 && errors.length === 0;

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      {/* Success header */}
      {isSuccess && (
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium text-foreground">Import Complete</span>
        </div>
      )}

      {/* Results summary */}
      <div className="flex flex-wrap gap-4">
        {/* Imported count (green) */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{imported}</p>
            <p className="text-xs text-muted-foreground">Imported</p>
          </div>
        </div>

        {/* Skipped count (yellow) */}
        {skipped > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{skipped}</p>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </div>
          </div>
        )}

        {/* Error count (red) */}
        {hasErrors && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{errors.length}</p>
              <p className="text-xs text-muted-foreground">Errors</p>
            </div>
          </div>
        )}
      </div>

      {/* Expandable error list */}
      {hasErrors && (
        <div className="mt-4 border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsErrorsExpanded(!isErrorsExpanded)}
            className="w-full justify-between text-muted-foreground hover:text-foreground"
          >
            <span className="text-sm">
              {isErrorsExpanded ? "Hide" : "Show"} error details
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
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                      Row {error.row}
                    </span>
                    <span className="text-muted-foreground">{error.message}</span>
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
