# Production Deployment Fix Guide

## Issue 1: Missing Admin Build

**Error:** `Could not find index.html in the admin build directory`

### Fix on Production Server

```bash
# SSH into your production server
cd ~/false

# Stop the running instance
pm2 stop medusa

# Build the application (this creates the admin panel)
npm run build

# This will:
# 1. Build the Medusa admin panel
# 2. Run database migrations
# 3. Create necessary symlinks

# Restart the server
pm2 restart medusa

# Check logs
pm2 logs medusa
```

## Issue 2: Shipping Options Have No Prices

The Medusa Fulfillment Module's `updateShippingOptions` doesn't properly update prices. You need to configure prices through the admin panel or directly in the database.

### Option 1: Admin Panel (Recommended)

1. After the server is running, go to: `http://YOUR_SERVER_IP:9000/admin`
2. Login with your admin credentials
3. Navigate to: **Settings → Locations → Shipping Options**
4. For each shipping option:
   - Click "Edit"
   - Add price: **1500** for Standard (AED 15.00)
   - Add price: **2500** for Express (AED 25.00)
   - Save changes

### Option 2: Direct Database Update (If admin panel doesn't work)

```bash
# On production server
cd ~/false

# Create a script to update prices via SQL
cat > update-shipping-prices.sql << 'EOF'
-- Update UAE Standard Shipping
UPDATE shipping_option_price 
SET amount = 1500 
WHERE shipping_option_id = (
  SELECT id FROM shipping_option WHERE name LIKE '%STANDARD%'
) AND currency_code = 'aed';

-- Update UAE Express Shipping  
UPDATE shipping_option_price 
SET amount = 2500 
WHERE shipping_option_id = (
  SELECT id FROM shipping_option WHERE name LIKE '%EXPRESS%'
) AND currency_code = 'aed';

-- Verify
SELECT so.name, sop.currency_code, sop.amount 
FROM shipping_option so 
LEFT JOIN shipping_option_price sop ON so.id = sop.shipping_option_id;
EOF

# Execute (adjust based on your database setup)
# For PostgreSQL:
psql -U your_db_user -d your_db_name -f update-shipping-prices.sql
```

## Issue 3: Frontend CSP Headers

The Content Security Policy headers have been updated in `next.config.ts` to allow Stripe, hCaptcha, and other third-party services. Make sure to redeploy the frontend after pulling the latest changes.

## Deployment Checklist

### Backend (false/)

- [ ] Run `npm run build`
- [ ] Run database migrations (included in build)
- [ ] Configure shipping option prices
- [ ] Restart with `pm2 restart medusa`
- [ ] Verify with `pm2 logs medusa`
- [ ] Test shipping options: `npm run fix-shipping-prices`

### Frontend (multi-brand-shop/)

- [ ] Pull latest changes
- [ ] Verify environment variables in `.env.local`
- [ ] Run `npm run build`
- [ ] Deploy to Vercel/hosting
- [ ] Test checkout page
- [ ] Verify shipping options display with prices

## Quick Commands

```bash
# Backend - Build and restart
cd ~/false
npm run build
pm2 restart medusa
pm2 logs medusa --lines 50

# Check shipping configuration
npm run fix-shipping-prices

# Frontend - Rebuild (local)
cd ~/multi-brand-shop
npm run build
# Then deploy via your CI/CD or Vercel

# Check if backend is accessible
curl http://localhost:9000/health
```

## Environment Variables to Verify

### Backend (.env)

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
MEDUSA_ADMIN_ONBOARDING_TYPE=default
STORE_CORS=https://your-frontend-domain.com
ADMIN_CORS=https://your-frontend-domain.com
AUTH_CORS=https://your-frontend-domain.com
STRIPE_API_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://your-backend-domain.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
MEDUSA_BACKEND_URL=https://your-backend-domain.com
```

## Monitoring After Deployment

```bash
# Watch logs
pm2 logs medusa

# Check process status
pm2 status

# Restart if needed
pm2 restart medusa

# Save PM2 configuration
pm2 save
```
