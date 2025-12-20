# Medusa Backend Deployment Guide for Digital Ocean

## Issue Resolution

### Problem

The Medusa v2 server was failing to start with the error:

```
Could not find index.html in the admin build directory
```

### Root Cause

Medusa v2's admin loader automatically sets `outDir` to `{projectRoot}/public/admin` (hardcoded in the loader), but the build process creates the admin panel at `.medusa/server/public/admin`. This mismatch causes the server to fail when starting in production mode.

### Solution

Create a symbolic link from `public/admin` to `.medusa/server/public/admin` after building. This is now automated in the build script.

## Deployment Steps for Digital Ocean

### 1. Prerequisites

- Node.js >= 20
- PostgreSQL database (can use DigitalOcean Managed Database)
- Redis instance (can use DigitalOcean Managed Redis)
- Git repository access

### 2. Environment Variables

Create a `.env` file or set these environment variables in your Digital Ocean App Platform:

```bash
# Required - Change these to strong secrets in production
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
COOKIE_SECRET=your-super-secure-cookie-secret-at-least-32-characters-long

# Database (use your DigitalOcean managed database connection string)
DATABASE_URL=postgres://username:password@host:port/database

# Redis (use your DigitalOcean managed Redis connection string)
REDIS_URL=redis://username:password@host:port

# CORS - Update these with your actual frontend URLs
STORE_CORS=https://your-storefront-domain.com
ADMIN_CORS=https://your-admin-domain.com
AUTH_CORS=https://your-admin-domain.com

# Backend URL - Your Medusa API URL
MEDUSA_BACKEND_URL=https://your-api-domain.com

# Stripe (if using)
STRIPE_API_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Set to production
NODE_ENV=production

# Worker mode for background jobs
MEDUSA_WORKER_MODE=shared
```

### 3. Build Process

The build script now handles everything automatically:

```bash
npm run build
```

This will:

1. Build the Medusa backend
2. Build the admin panel
3. Run database migrations
4. Create the necessary symbolic link for the admin panel

### 4. Starting the Server

**Development mode (local):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

### 5. DigitalOcean App Platform Configuration

If deploying to App Platform, use these settings:

**Build Command:**

```bash
npm install && npm run build
```

**Run Command:**

```bash
npm start
```

**Health Check:**

- Path: `/health`
- Port: 9000

### 6. Post-Deployment

1. **Seed data** (if needed):

   ```bash
   npm run seed
   ```

2. **Create admin user**:
   Access the admin panel at `https://your-api-domain.com/app` and create your first admin user.

3. **Test API**:

   ```bash
   curl https://your-api-domain.com/health
   ```

## Troubleshooting

### Admin panel not loading

1. Verify the symbolic link exists:

   ```bash
   ls -la public/admin
   ```

   Should show: `admin -> /path/to/.medusa/server/public/admin`

2. Rebuild if necessary:

   ```bash
   rm -rf .medusa public
   npm run build
   ```

### Database connection issues

- Ensure your DATABASE_URL is correct
- For DigitalOcean Managed Databases, you may need to add SSL parameters:

  ```
  DATABASE_URL=postgres://user:pass@host:port/db?sslmode=require
  ```

### Redis connection issues

- Verify REDIS_URL is correct
- Check that your DigitalOcean Redis instance allows connections from your app

### Build fails

- Ensure Node.js version >= 20
- Clear node_modules and reinstall:

  ```bash
  rm -rf node_modules package-lock.json
  npm install
  npm run build
  ```

## Production Checklist

- [ ] Strong JWT_SECRET and COOKIE_SECRET set
- [ ] DATABASE_URL configured with production database
- [ ] REDIS_URL configured
- [ ] CORS origins updated for your domains
- [ ] NODE_ENV=production
- [ ] Stripe keys updated to live keys (if using)
- [ ] Database backups configured
- [ ] Monitoring/logging set up
- [ ] SSL/HTTPS enabled
- [ ] Health checks configured

## Notes

- The symbolic link approach is required due to Medusa v2's hardcoded admin build location
- This has been automated in the build script for convenience
- The admin panel will be accessible at `/app` path (e.g., `https://your-domain.com/app`)
- In development mode (`npm run dev`), the admin is served differently and doesn't require the symlink
