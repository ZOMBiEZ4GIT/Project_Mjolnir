import { toast } from "sonner";

interface ShowErrorOptions {
  description?: string;
  onRetry?: () => void;
}

/**
 * Show a success toast. Auto-dismisses after 3 seconds.
 */
export function showSuccess(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

/**
 * Show an error toast. Persists until manually dismissed.
 * Optionally includes a Retry action button.
 */
export function showError(message: string, options?: ShowErrorOptions) {
  toast.error(message, {
    description: options?.description,
    duration: Infinity,
    ...(options?.onRetry && {
      action: {
        label: "Retry",
        onClick: options.onRetry,
      },
    }),
  });
}

/**
 * Show an info toast. Auto-dismisses after 4 seconds.
 */
export function showInfo(message: string) {
  toast.info(message, {
    duration: 4000,
  });
}
