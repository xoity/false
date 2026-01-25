/**
 * Backend configuration and environment validation
 */

/**
 * Application configuration constants
 * Use these instead of accessing process.env directly
 */
export const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
  isTest: process.env.NODE_ENV === "test",

  // Server
  port: parseInt(process.env.PORT || "9000", 10),
  host: process.env.HOST || "localhost",

  // Database
  databaseUrl: process.env.DATABASE_URL || "",
  databaseLogging: process.env.DATABASE_LOGGING === "true",

  // Redis
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  // JWT & Auth
  jwtSecret: process.env.JWT_SECRET || "",
  cookieSecret: process.env.COOKIE_SECRET || "",
  sessionSecret: process.env.SESSION_SECRET || "",

  // Admin
  adminCorsOrigin: process.env.ADMIN_CORS || "http://localhost:7001",
  storeCorsOrigin: process.env.STORE_CORS || "http://localhost:8000",

  // Workers
  workerMode: process.env.MEDUSA_WORKER_MODE || "shared",

  // Feature Flags
  enableBannerModule: process.env.ENABLE_BANNER_MODULE !== "false",
  enableCustomRoutes: process.env.ENABLE_CUSTOM_ROUTES !== "false",

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",
  enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === "true",

  // Pagination
  defaultPageSize: 20,
  maxPageSize: 100,

  // Rate Limiting
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 100,

  // Timeouts
  apiTimeout: 30000, // 30 seconds
  dbQueryTimeout: 10000, // 10 seconds
} as const;

/**
 * Validates required environment variables
 * @throws {Error} If required variables are missing
 */
export function validateConfig(): void {
  const required = ["DATABASE_URL", "JWT_SECRET", "COOKIE_SECRET"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  // Validate JWT secret length
  if (config.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }

  // Validate cookie secret length
  if (config.cookieSecret.length < 32) {
    throw new Error("COOKIE_SECRET must be at least 32 characters long");
  }
}

/**
 * Type-safe config getter
 */
export function getConfig<K extends keyof typeof config>(key: K): (typeof config)[K] {
  return config[key];
}

/**
 * Gets environment variable with fallback
 */
export function getEnv(key: string, fallback: string = ""): string {
  return process.env[key] ?? fallback;
}

/**
 * Gets environment variable as integer
 */
export function getEnvInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`Invalid integer value for ${key}: ${value}, using fallback: ${fallback}`);
    return fallback;
  }

  return parsed;
}

/**
 * Gets environment variable as boolean
 */
export function getEnvBool(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === "true" || value === "1";
}

// Validate config on module load (only in non-test environments)
if (config.nodeEnv !== "test") {
  try {
    validateConfig();
  } catch (error) {
    console.error("Configuration validation failed:", error);
    if (config.isProduction) {
      process.exit(1);
    }
  }
}
