"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Inbox,
} from "lucide-react";
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

export function RecentImports({
  imports,
  isLoading = false,
  className = "",
}: RecentImportsProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-800 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-800 bg-gray-900/50 p-8 ${className}`}>
        <div className="flex flex-col items-center justify-center text-center">
          <Inbox className="h-12 w-12 text-gray-600 mb-3" />
          <p className="text-gray-400">No imports yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Your import history will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {imports.map((record) => {
        const hasErrors = record.errors.length > 0;
        const isExpanded = expandedId === record.id;

        return (
          <div
            key={record.id}
            className="rounded-lg border border-gray-800 bg-gray-900/50 overflow-hidden"
          >
            <div
              className={`p-4 ${hasErrors ? "cursor-pointer hover:bg-gray-800/50" : ""}`}
              onClick={() => hasErrors && toggleExpanded(record.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {hasErrors ? (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-white truncate max-w-[200px]">
                        {record.filename}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          record.type === "transactions"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}
                      >
                        {record.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span className="text-emerald-400">
                        {record.imported} imported
                      </span>
                      {record.skipped > 0 && (
                        <span className="text-yellow-400">
                          {record.skipped} skipped
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
                  <button
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label={isExpanded ? "Collapse errors" : "Expand errors"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Expanded error details */}
            {isExpanded && hasErrors && (
              <div className="px-4 pb-4 border-t border-gray-800">
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {record.errors.map((error, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs whitespace-nowrap">
                        Row {error.row}
                      </span>
                      <span className="text-gray-400">{error.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
