/**
 * Retry utility with exponential backoff.
 *
 * Provides a generic retry wrapper for async operations that may fail
 * due to transient errors (network issues, rate limiting, etc.).
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds between retries (default: 10000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Optional function to determine if an error is retryable (default: all errors) */
  isRetryable?: (error: unknown) => boolean;
  /** Optional callback for logging retry attempts */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "isRetryable" | "onRetry">> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Waits for a specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates the delay for a given retry attempt using exponential backoff.
 *
 * @param attempt - The current retry attempt (1-based)
 * @param initialDelayMs - Initial delay in milliseconds
 * @param maxDelayMs - Maximum delay cap
 * @param backoffMultiplier - Multiplier for exponential growth
 * @returns Delay in milliseconds
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  // Exponential backoff: initialDelay * (multiplier ^ (attempt - 1))
  const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  // Add jitter (0-20% of delay) to prevent thundering herd
  const jitter = delay * Math.random() * 0.2;
  return Math.min(delay + jitter, maxDelayMs);
}

/**
 * Executes an async function with retry logic and exponential backoff.
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function if successful
 * @throws The last error if all retries are exhausted
 *
 * @example
 * // Basic usage
 * const result = await withRetry(() => fetchSomething());
 *
 * @example
 * // With custom options
 * const result = await withRetry(
 *   () => fetchPriceFromApi(symbol),
 *   {
 *     maxRetries: 3,
 *     initialDelayMs: 500,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry ${attempt}: ${error}`);
 *     },
 *   }
 * );
 *
 * @example
 * // With retryable error filter
 * const result = await withRetry(
 *   () => callExternalApi(),
 *   {
 *     isRetryable: (error) => {
 *       // Only retry network errors or 5xx status codes
 *       if (error instanceof NetworkError) return true;
 *       if (error instanceof ApiError && error.status >= 500) return true;
 *       return false;
 *     },
 *   }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
  } = { ...DEFAULT_OPTIONS, ...options };

  const { isRetryable, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we've exhausted retries
      if (attempt === maxRetries) {
        break;
      }

      // Check if the error is retryable
      if (isRetryable && !isRetryable(error)) {
        break;
      }

      // Calculate delay for next retry
      const delay = calculateDelay(
        attempt + 1,
        initialDelayMs,
        maxDelayMs,
        backoffMultiplier
      );

      // Log retry attempt if callback provided
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * Determines if an error is likely a transient error that should be retried.
 *
 * Includes:
 * - Network errors (ENOTFOUND, ETIMEDOUT, ECONNREFUSED, ECONNRESET)
 * - HTTP 5xx server errors
 * - HTTP 429 rate limiting (with appropriate backoff)
 * - Timeout errors
 *
 * Excludes:
 * - HTTP 4xx client errors (except 429)
 * - Validation errors
 * - Authentication/authorization errors
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  // Network-related errors
  if (
    message.includes("enotfound") ||
    message.includes("etimedout") ||
    message.includes("econnrefused") ||
    message.includes("econnreset") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("socket hang up")
  ) {
    return true;
  }

  // Check for HTTP status codes in error messages or properties
  const errorWithStatus = error as { status?: number; statusCode?: number };
  const status = errorWithStatus.status || errorWithStatus.statusCode;

  if (status) {
    // 5xx server errors are retryable
    if (status >= 500 && status < 600) {
      return true;
    }
    // 429 rate limiting - should retry with backoff
    if (status === 429) {
      return true;
    }
  }

  return false;
}
