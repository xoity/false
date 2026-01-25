import { ApiError } from "../types";

/**
 * Custom error class for Medusa backend errors
 */
export class MedusaApplicationError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = "MEDUSA_ERROR",
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "MedusaApplicationError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MedusaApplicationError);
    }
  }
}

/**
 * Wraps an async function with error handling
 */
export async function asyncHandler<T>(
  fn: () => Promise<T>,
  errorMessage: string = "An error occurred"
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(errorMessage, error);

    if (error instanceof MedusaApplicationError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new MedusaApplicationError(error.message || errorMessage, "ASYNC_ERROR", 500, {
        originalError: error.message,
        stack: error.stack,
      });
    }

    throw new MedusaApplicationError(errorMessage, "UNKNOWN_ERROR", 500);
  }
}

/**
 * Safe async wrapper that returns [error, result] tuple
 */
export async function safeAsync<T>(
  promise: Promise<T>
): Promise<[MedusaApplicationError | null, T | null]> {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    if (error instanceof MedusaApplicationError) {
      return [error, null];
    }

    if (error instanceof Error) {
      return [new MedusaApplicationError(error.message, "SAFE_ASYNC_ERROR", 500), null];
    }

    return [new MedusaApplicationError("Unknown error occurred", "UNKNOWN_ERROR", 500), null];
  }
}

/**
 * Retry wrapper for async functions
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`, error);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new MedusaApplicationError(
    `Failed after ${maxRetries} attempts: ${lastError?.message ?? "Unknown error"}`,
    "RETRY_EXHAUSTED",
    500,
    { attempts: maxRetries, lastError: lastError?.message }
  );
}

/**
 * Timeout wrapper for async functions
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new MedusaApplicationError(errorMessage, "TIMEOUT", 408)), timeoutMs)
    ),
  ]);
}

/**
 * API error handler for Medusa route handlers
 */
export function handleApiError(error: unknown): ApiError {
  console.error("API Error:", error);

  if (error instanceof MedusaApplicationError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production" ? "An internal error occurred" : error.message,
      statusCode: 500,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "An unknown error occurred",
    statusCode: 500,
  };
}

/**
 * Validates that a value is not null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  errorMessage: string = "Value is required"
): asserts value is T {
  if (value === null || value === undefined) {
    throw new MedusaApplicationError(errorMessage, "ASSERTION_ERROR", 400);
  }
}

/**
 * Type-safe null check with default value
 */
export function withDefault<T>(value: T | null | undefined, defaultValue: T): T {
  return value ?? defaultValue;
}

/**
 * Null-safe property access
 */
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue?: T[K]
): T[K] | undefined {
  if (obj === null || obj === undefined) {
    return defaultValue;
  }
  return obj[key] ?? defaultValue;
}

/**
 * Safe array access with bounds checking
 */
export function safeArrayAccess<T>(
  arr: T[] | null | undefined,
  index: number,
  defaultValue?: T
): T | undefined {
  if (!arr || index < 0 || index >= arr.length) {
    return defaultValue;
  }
  const item = arr[index];
  return item !== undefined ? item : defaultValue;
}

/**
 * Logger utility with error tracking
 */
export const logger = {
  error: (message: string, error?: unknown, meta?: Record<string, unknown>): void => {
    console.error(`[ERROR] ${message}`, { error, meta, timestamp: new Date().toISOString() });
  },

  warn: (message: string, meta?: Record<string, unknown>): void => {
    console.warn(`[WARN] ${message}`, { meta, timestamp: new Date().toISOString() });
  },

  info: (message: string, meta?: Record<string, unknown>): void => {
    console.info(`[INFO] ${message}`, { meta, timestamp: new Date().toISOString() });
  },

  debug: (message: string, meta?: Record<string, unknown>): void => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, { meta, timestamp: new Date().toISOString() });
    }
  },
};

/**
 * Validates and sanitizes user input
 */
export function validateInput<T extends Record<string, unknown>>(
  input: unknown,
  schema: { [K in keyof T]: (value: unknown) => boolean }
): T {
  if (typeof input !== "object" || input === null) {
    throw new MedusaApplicationError("Invalid input: expected object", "VALIDATION_ERROR", 400);
  }

  const validated: Partial<T> = {};

  for (const [key, validator] of Object.entries(schema)) {
    const value = (input as Record<string, unknown>)[key];
    if (!validator(value)) {
      throw new MedusaApplicationError(`Invalid input for field: ${key}`, "VALIDATION_ERROR", 400);
    }
    validated[key as keyof T] = value as T[keyof T];
  }

  return validated as T;
}
