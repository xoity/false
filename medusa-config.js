const path = require("path");
const { loadEnv, defineConfig } = require("@medusajs/framework/utils");

loadEnv(process.env.NODE_ENV || "development", process.cwd());

// Ensure secrets are strong in production
if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "supersecret") {
    throw new Error("JWT_SECRET must be set to a strong value in production");
  }
  if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET === "supersecret") {
    throw new Error("COOKIE_SECRET must be set to a strong value in production");
  }
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // DigitalOcean Managed Databases require SSL in production
    databaseDriverOptions: {},
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      // Enhanced cookie configuration for security
      cookieOptions: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
      // Redis session store configuration
      session: {
        store: process.env.REDIS_URL
          ? {
              resave: false,
              saveUninitialized: false,
              ttl: 7 * 24 * 60 * 60, // 7 days in seconds
            }
          : undefined,
      },
    },
    // Redis URL for session storage
    redisUrl: process.env.REDIS_URL,
    // Worker mode: "server" for API only, "worker" for jobs only, "shared" for both (dev)
    workerMode: process.env.MEDUSA_WORKER_MODE,
  },

  admin: {
    disable: process.env.DISABLE_ADMIN === "true",
    path: "/app",
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },
  modules: [
    {
      resolve: "./src/modules/banner",
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-local",
            id: "local",
            options: {
              // The base URL for the uploaded files - must be set correctly in production
              backend_url:
                (process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "") +
                "/uploads",
              // The directory where files will be stored (relative to project root)
              upload_dir: "uploads",
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/auth-emailpass",
            id: "emailpass",
            options: {
              // Email/password authentication for customers
            },
          },
        ],
      },
    },
    {
      key: "cache",
      resolve: "@medusajs/cache-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      key: "eventBus",
      resolve: "@medusajs/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
              // Force automatic capture instead of manual
              capture: true,
            },
          },
        ],
      },
    },
  ],
});
