/**
 * API Error Handling Utility
 *
 * Provides consistent error handling across API routes with:
 * - Typed ApiError class for structured errors
 * - User-friendly messages for common error types
 * - Contextual logging for debugging
 */

/**
 * HTTP status codes mapped to user-friendly descriptions.
 */
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input and try again.",
  401: "You must be logged in to access this resource.",
  403: "You don't have permission to access this resource.",
  404: "The requested resource was not found.",
  405: "This action is not allowed.",
  409: "This operation conflicts with existing data.",
  422: "Unable to process the request. Please check your input.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong. Please try again later.",
  502: "Unable to connect to the server. Please try again.",
  503: "Service temporarily unavailable. Please try again later.",
  504: "Request timed out. Please try again.",
};

/**
 * Common error types for categorization.
 */
export type ApiErrorType =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNKNOWN";

/**
 * Additional details that can be attached to an API error.
 */
export interface ApiErrorDetails {
  /** Field-level validation errors */
  fieldErrors?: Record<string, string>;
  /** The original error that caused this API error */
  cause?: unknown;
  /** Additional context for debugging */
  context?: Record<string, unknown>;
  /** Timestamp when the error occurred */
  timestamp?: string;
}

/**
 * Custom error class for API errors with structured information.
 *
 * @example
 * // Simple error
 * throw new ApiError("User not found", 404);
 *
 * // With details
 * throw new ApiError("Validation failed", 400, {
 *   fieldErrors: { email: "Invalid email format" }
 * });
 *
 * // From fetch error
 * try {
 *   const res = await fetch("/api/data");
 *   if (!res.ok) throw ApiError.fromResponse(res);
 * } catch (err) {
 *   handleApiError(err, "fetching user data");
 * }
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly type: ApiErrorType;
  public readonly details?: ApiErrorDetails;
  public readonly userMessage: string;

  constructor(
    message: string,
    status: number = 500,
    details?: ApiErrorDetails
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.type = ApiError.getTypeFromStatus(status);
    this.details = {
      ...details,
      timestamp: details?.timestamp ?? new Date().toISOString(),
    };
    this.userMessage = ApiError.getUserMessage(status, message);

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Determines the error type from HTTP status code.
   */
  private static getTypeFromStatus(status: number): ApiErrorType {
    if (status === 400 || status === 422) return "VALIDATION_ERROR";
    if (status === 401) return "UNAUTHORIZED";
    if (status === 403) return "FORBIDDEN";
    if (status === 404) return "NOT_FOUND";
    if (status === 409) return "CONFLICT";
    if (status === 429) return "RATE_LIMITED";
    if (status === 504) return "TIMEOUT";
    if (status >= 500) return "SERVER_ERROR";
    return "UNKNOWN";
  }

  /**
   * Gets a user-friendly message based on status code.
   */
  private static getUserMessage(status: number, fallback: string): string {
    return HTTP_STATUS_MESSAGES[status] ?? fallback;
  }

  /**
   * Creates an ApiError from a fetch Response object.
   *
   * @param response - The Response object from fetch
   * @param context - Optional context for logging
   * @returns Promise<ApiError> - The constructed ApiError
   *
   * @example
   * const response = await fetch("/api/holdings");
   * if (!response.ok) {
   *   throw await ApiError.fromResponse(response);
   * }
   */
  static async fromResponse(
    response: Response,
    context?: Record<string, unknown>
  ): Promise<ApiError> {
    let message = `Request failed with status ${response.status}`;
    let fieldErrors: Record<string, string> | undefined;

    try {
      const body = await response.json();
      // Handle both { error: "..." } and { errors: { field: "..." } } formats
      if (typeof body.error === "string") {
        message = body.error;
      } else if (typeof body.message === "string") {
        message = body.message;
      }

      if (body.errors && typeof body.errors === "object") {
        fieldErrors = body.errors;
      }
    } catch {
      // Response body couldn't be parsed as JSON
    }

    return new ApiError(message, response.status, {
      fieldErrors,
      context: {
        ...context,
        url: response.url,
        statusText: response.statusText,
      },
    });
  }

  /**
   * Creates an ApiError from an unknown error (useful in catch blocks).
   *
   * @param error - The unknown error from a catch block
   * @param context - Optional context for logging
   * @returns ApiError - The constructed ApiError
   *
   * @example
   * try {
   *   await someOperation();
   * } catch (error) {
   *   throw ApiError.fromUnknown(error, { operation: "someOperation" });
   * }
   */
  static fromUnknown(
    error: unknown,
    context?: Record<string, unknown>
  ): ApiError {
    // Already an ApiError
    if (error instanceof ApiError) {
      return error;
    }

    // Standard Error
    if (error instanceof Error) {
      // Network errors
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        return new ApiError("Unable to connect to the server", 502, {
          cause: error,
          context,
        });
      }

      // Abort/timeout errors
      if (error.name === "AbortError") {
        return new ApiError("Request was cancelled", 499, {
          cause: error,
          context,
        });
      }

      return new ApiError(error.message, 500, {
        cause: error,
        context,
      });
    }

    // String error
    if (typeof error === "string") {
      return new ApiError(error, 500, { context });
    }

    // Unknown error type
    return new ApiError("An unexpected error occurred", 500, {
      cause: error,
      context,
    });
  }

  /**
   * Checks if an error is an ApiError.
   */
  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }

  /**
   * Converts the error to a JSON-serializable object for API responses.
   */
  toJSON(): Record<string, unknown> {
    return {
      error: this.message,
      status: this.status,
      type: this.type,
      ...(this.details?.fieldErrors && { errors: this.details.fieldErrors }),
    };
  }
}

/**
 * Result of handleApiError function.
 */
export interface HandleApiErrorResult {
  /** User-friendly message suitable for display */
  message: string;
  /** HTTP status code */
  status: number;
  /** Error type for conditional handling */
  type: ApiErrorType;
  /** Field-level errors for form validation */
  fieldErrors?: Record<string, string>;
}

/**
 * Handles errors in catch blocks with logging and user-friendly messages.
 *
 * This function:
 * 1. Logs the error with context for debugging
 * 2. Returns a structured result with user-friendly messaging
 * 3. Preserves field-level validation errors when available
 *
 * @param error - The error from a catch block
 * @param context - Description of what operation failed (for logging)
 * @returns HandleApiErrorResult - Structured error information
 *
 * @example
 * // In an API route handler
 * try {
 *   const data = await fetchUserData();
 *   return NextResponse.json(data);
 * } catch (error) {
 *   const { message, status } = handleApiError(error, "fetching user data");
 *   return NextResponse.json({ error: message }, { status });
 * }
 *
 * @example
 * // In a React Query mutation
 * onError: (error) => {
 *   const { message, fieldErrors } = handleApiError(error, "saving holding");
 *   if (fieldErrors) {
 *     setFormErrors(fieldErrors);
 *   } else {
 *     toast.error(message);
 *   }
 * }
 */
export function handleApiError(
  error: unknown,
  context: string
): HandleApiErrorResult {
  // Convert to ApiError for consistent handling
  const apiError = ApiError.fromUnknown(error);

  // Log for debugging with context
  console.error(`[API Error] ${context}:`, {
    message: apiError.message,
    status: apiError.status,
    type: apiError.type,
    details: apiError.details,
    stack: apiError.stack,
  });

  return {
    message: apiError.userMessage,
    status: apiError.status,
    type: apiError.type,
    fieldErrors: apiError.details?.fieldErrors,
  };
}

/**
 * Creates an API error response for Next.js API routes.
 * Convenience wrapper around handleApiError for route handlers.
 *
 * @param error - The error from a catch block
 * @param context - Description of what operation failed
 * @returns Object with error message and status for NextResponse.json()
 *
 * @example
 * import { NextResponse } from "next/server";
 *
 * export async function GET() {
 *   try {
 *     const data = await fetchData();
 *     return NextResponse.json(data);
 *   } catch (error) {
 *     const { body, status } = createApiErrorResponse(error, "fetching data");
 *     return NextResponse.json(body, { status });
 *   }
 * }
 */
export function createApiErrorResponse(
  error: unknown,
  context: string
): { body: { error: string; errors?: Record<string, string> }; status: number } {
  const result = handleApiError(error, context);

  return {
    body: {
      error: result.message,
      ...(result.fieldErrors && { errors: result.fieldErrors }),
    },
    status: result.status,
  };
}
