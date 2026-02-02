"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChartErrorProps {
  /**
   * The error message to display. Defaults to a generic message.
   */
  message?: string;
  /**
   * Callback function to retry loading the chart data.
   * If provided, a retry button will be displayed.
   */
  onRetry?: () => void;
  /**
   * Whether to show in a card container with border. Defaults to false.
   */
  withContainer?: boolean;
  /**
   * Optional className for additional styling.
   */
  className?: string;
}

/**
 * Error state component for chart components.
 *
 * Displays a friendly error message with an optional retry button.
 * Provides consistent error states across all chart components.
 */
export function ChartError({
  message = "Failed to load chart data",
  onRetry,
  withContainer = false,
  className = "",
}: ChartErrorProps) {
  const content = (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-8 ${className}`}
    >
      <div className="flex items-center gap-2 text-red-400">
        <AlertTriangle className="h-5 w-5" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );

  if (withContainer) {
    return (
      <div className="rounded-lg border border-red-700/50 bg-red-900/10 p-6">
        {content}
      </div>
    );
  }

  return content;
}
