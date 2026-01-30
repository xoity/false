# Production Setup Guide

## Complete Medusa Production Setup Script

This script (`production-setup.ts`) sets up your Medusa production environment to match your localhost configuration exactly.

### What It Does

The script automatically configures:

1. ✅ **Admin User** - Creates admin account with your credentials
2. ✅ **Store Configuration** - Sets up currencies (AED, USD, EUR)
3. ✅ **UAE Region** - Creates region with AED currency
4. ✅ **Stock Location** - UAE Warehouse in Sharjah
5. ✅ **Sales Channels** - Default sales channel
6. ✅ **Shipping Profiles** - Default shipping profile
7. ✅ **Service Zones** - UAE and GCC Countries zones
8. ✅ **Shipping Options** - With prices already attached:
   - UAE Standard: AED 15.00 (2-3 days)
   - UAE Express: AED 25.00 (Next day)
   - GCC International: AED 50.00 (5-7 days)
9. ✅ **Tax Regions** - UAE tax configuration

### Prerequisites

Ensure these environment variables are set on your production server:

```bash
# Required
ADMIN_EMAIL=your-admin@example.com
ADMIN_PASSWORD=your-secure-password
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Recommended
MEDUSA_BACKEND_URL=https://your-backend-domain.com
JWT_SECRET=your-production-jwt-secret-min-32-chars
COOKIE_SECRET=your-production-cookie-secret-min-32-chars
```

### How to Run

#### On Production Server (Coolify Terminal)

```bash
# Navigate to your app directory
cd /app

# Run the production setup
pnpm run production-setup
```

#### Locally (for testing)

```bash
cd false
pnpm run production-setup
```

### Expected Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 MEDUSA PRODUCTION SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Step 1: Setting up admin user...
   ✓ Created admin user: admin@example.com

🏪 Step 2: Configuring store...
   ✓ Store currencies configured (AED default)

📺 Step 3: Setting up sales channel...
   ✓ Created Default Sales Channel

🇦🇪 Step 4: Setting up UAE region...
   ✓ Created UAE region (AED)
   ✓ Created tax region for UAE

📦 Step 5: Setting up stock location...
   ✓ Created stock location: UAE Warehouse - Sharjah

🚚 Step 6: Setting up shipping profiles...
   ✓ Created Default Shipping Profile

🌍 Step 7: Setting up fulfillment sets and service zones...
   ✓ Created fulfillment set: UAE & GCC Shipping
   ✓ Created service zone: UAE
   ✓ Created service zone: GCC Countries

💰 Step 8: Setting up shipping options with prices...
   ✓ Created 3 shipping options with prices

🔗 Step 9: Linking sales channel to stock location...
   ✓ Linked Default Sales Channel to stock location

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PRODUCTION SETUP COMPLETE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### After Setup

1. **Verify Admin Panel**: Visit `https://your-backend-url/app` and login
2. **Check Shipping Options**: Go to Settings → Locations & Shipping
3. **Test Order Creation**: Place a test order from your frontend
4. **Restart Backend**: In Coolify, restart your Medusa service

### Troubleshooting

#### Script fails with "Admin user already exists"

This is normal - the script skips existing resources. It will only create what's missing.

#### Shipping options not visible in Admin UI

Make sure you've restarted the backend after running the script.

#### Orders still failing

1. Check backend logs for specific errors
2. Verify Stripe webhook is configured correctly
3. Ensure STRIPE_API_KEY and STRIPE_WEBHOOK_SECRET are set

### Idempotent Design

This script is **safe to run multiple times**:

- ✅ Won't create duplicate resources
- ✅ Reuses existing configurations
- ✅ Only creates missing items
- ✅ No data loss

### Compare with Localhost

To verify your production matches localhost:

```bash
# Localhost
cd false
pnpm run dev
# Visit http://localhost:9000/app

# Production
# Visit https://your-backend-url/app
```

Both should now have:

- Same admin credentials
- Same regions (UAE with AED)
- Same shipping options with prices
- Same store configuration

### Related Scripts

- `pnpm run create-admin` - Create/update admin user only
- `pnpm run setup-shipping` - Setup shipping only (without prices)
- `pnpm run add-shipping-prices` - Add prices to existing shipping options
- `pnpm run seed` - Seed demo products (Europe-focused)

### Notes

- The script creates **UAE-focused** configuration (not European like the seed script)
- Shipping prices are in **cents** (1500 = AED 15.00)
- GCC countries include: Saudi Arabia, Kuwait, Bahrain, Qatar, Oman
- Payment provider must be configured separately in Admin UI
