import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Ensure secrets are strong in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecret') {
    throw new Error('JWT_SECRET must be set to a strong value in production');
  }
  if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET === 'supersecret') {
    throw new Error('COOKIE_SECRET must be set to a strong value in production');
  }
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // DigitalOcean Managed Databases require SSL in production
    databaseDriverOptions: process.env.NODE_ENV === "production" 
      ? { connection: { ssl: { rejectUnauthorized: false } } } 
      : {},
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:3000",
      authCors: process.env.AUTH_CORS || "http://localhost:3000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    redisUrl: process.env.REDIS_URL,
    // Recommended for production to handle background jobs
    workerMode: process.env.MEDUSA_WORKER_MODE || "shared"
  },
  modules: [
    {
      resolve: "./src/modules/banner",
    },
    {
      key: "cache",
      resolve: "@medusajs/cache-redis",
      options: {
        redisUrl: process.env.REDIS_URL
      }
    },
    {
      key: "eventBus",
      resolve: "@medusajs/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL
      }
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
            },
          },
        ],
      },
    },
  ]
})