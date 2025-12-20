# Quick Start - Production Deployment

## The Problem (Resolved)
Medusa v2 has a quirk where the admin panel builds to `.medusa/server/public/admin` but the production server looks for it in `public/admin` at the project root.

## The Solution
We've automated the fix in the build script using a symbolic link.

## To Deploy Anywhere (Including Digital Ocean)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Create `.env` file or set these in your hosting platform:
```bash
NODE_ENV=production
DATABASE_URL=your_postgres_connection_string
REDIS_URL=your_redis_connection_string
JWT_SECRET=your_strong_secret_min_32_chars
COOKIE_SECRET=your_strong_secret_min_32_chars
STORE_CORS=https://your-storefront.com
ADMIN_CORS=https://your-api.com
MEDUSA_BACKEND_URL=https://your-api.com
```

### 3. Build
```bash
npm run build
```

This automatically:
- Builds backend & admin
- Runs migrations
- Creates the admin symlink ✨

### 4. Start
```bash
npm start
```

### 5. Create Admin User (IMPORTANT!)
```bash
npm run create-admin
```

This creates an admin user from your `.env` file (`ADMIN_EMAIL` and `ADMIN_PASSWORD`).

## Access Points

- **API**: `http://your-domain:9000`
- **Admin Panel**: `http://your-domain:9000/app`
- **Health Check**: `http://your-domain:9000/health`

## For DigitalOcean App Platform

**Build Command:**
```
npm install && npm run build
```

**Run Command:**
```
npm start
```

That's it! 🎉

## Troubleshooting

If admin doesn't load:
```bash
rm -rf .medusa public
npm run build
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed information.
