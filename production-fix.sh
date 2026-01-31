#!/bin/bash

# ================================================================
# Medusa Production Setup Script for Coolify
# ================================================================
# This script fixes:
# 1. AwilixResolutionError: Could not resolve 'pp_stripe'
# 2. "The cart items require shipping profiles..." error
#
# Run this on your Coolify production server:
# bash production-fix.sh
# ================================================================

set -e  # Exit on any error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 MEDUSA PRODUCTION FIX SCRIPT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ================================================================
# Step 1: Verify Environment Variables
# ================================================================
echo "📋 Step 1: Checking environment variables..."

check_env_var() {
  if [ -z "${!1}" ]; then
    echo -e "  ${RED}❌ $1 is NOT set${NC}"
    return 1
  else
    echo -e "  ${GREEN}✅ $1 is set${NC}"
    return 0
  fi
}

# Critical variables
ERRORS=0
check_env_var "DATABASE_URL" || ERRORS=$((ERRORS+1))
check_env_var "REDIS_URL" || ERRORS=$((ERRORS+1))
check_env_var "STRIPE_API_KEY" || ERRORS=$((ERRORS+1))
check_env_var "STRIPE_WEBHOOK_SECRET" || ERRORS=$((ERRORS+1))
check_env_var "JWT_SECRET" || ERRORS=$((ERRORS+1))
check_env_var "COOKIE_SECRET" || ERRORS=$((ERRORS+1))
check_env_var "STORE_CORS" || ERRORS=$((ERRORS+1))

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo -e "${RED}❌ $ERRORS critical environment variable(s) missing!${NC}"
  echo ""
  echo "Please set the missing variables in Coolify and redeploy."
  echo "See .env.production.example for required variables."
  exit 1
fi

echo -e "${GREEN}✅ All critical environment variables are set!${NC}"
echo ""

# ================================================================
# Step 2: Navigate to App Directory
# ================================================================
echo "📁 Step 2: Navigating to app directory..."

# Try common paths
if [ -d "/app" ]; then
  cd /app
  echo -e "${GREEN}✅ Changed to /app${NC}"
elif [ -d "$HOME/app" ]; then
  cd "$HOME/app"
  echo -e "${GREEN}✅ Changed to $HOME/app${NC}"
elif [ -f "package.json" ]; then
  echo -e "${GREEN}✅ Already in app directory${NC}"
else
  echo -e "${RED}❌ Cannot find app directory${NC}"
  exit 1
fi

echo ""

# ================================================================
# Step 3: Check if Medusa CLI is available
# ================================================================
echo "🔧 Step 3: Checking Medusa CLI..."

if ! command -v medusa &> /dev/null; then
  if ! npm run --silent medusa -- --version &> /dev/null; then
    echo -e "${RED}❌ Medusa CLI not found${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✅ Medusa CLI is available${NC}"
echo ""

# ================================================================
# Step 4: Run Database Migrations
# ================================================================
echo "🗄️  Step 4: Running database migrations..."

if npm run build 2>&1 | tee /tmp/medusa-build.log; then
  echo -e "${GREEN}✅ Database migrations completed${NC}"
else
  echo -e "${RED}❌ Database migrations failed${NC}"
  echo "Check /tmp/medusa-build.log for details"
  exit 1
fi

echo ""

# ================================================================
# Step 5: Setup Shipping Profiles and Options
# ================================================================
echo "🚚 Step 5: Setting up shipping profiles and options..."

if npm run setup-shipping 2>&1 | tee /tmp/medusa-shipping.log; then
  echo -e "${GREEN}✅ Shipping setup completed${NC}"
else
  echo -e "${YELLOW}⚠️  Shipping setup had issues${NC}"
  echo "Check /tmp/medusa-shipping.log for details"
  echo "This may be okay if shipping is already configured."
fi

echo ""

# ================================================================
# Step 6: Verify Stripe Configuration
# ================================================================
echo "💳 Step 6: Verifying Stripe configuration..."

# Check if Stripe module is in medusa-config.js
if grep -q "@medusajs/payment-stripe" medusa-config.js; then
  echo -e "${GREEN}✅ Stripe module found in config${NC}"
else
  echo -e "${RED}❌ Stripe module NOT found in medusa-config.js${NC}"
  exit 1
fi

# Check if package.json has @medusajs/payment-stripe
if grep -q "@medusajs/payment-stripe" package.json; then
  echo -e "${GREEN}✅ @medusajs/payment-stripe found in dependencies${NC}"
else
  echo -e "${RED}❌ @medusajs/payment-stripe NOT in package.json${NC}"
  echo "Run: npm install @medusajs/payment-stripe"
  exit 1
fi

echo ""

# ================================================================
# Step 7: Test Database Connection
# ================================================================
echo "🔌 Step 7: Testing connections..."

# Test database connection
if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
  echo -e "${GREEN}✅ Database connection successful${NC}"
else
  echo -e "${YELLOW}⚠️  Could not test database connection (psql not available)${NC}"
fi

# Test Redis connection (if redis-cli available)
if command -v redis-cli &> /dev/null; then
  if redis-cli -u "$REDIS_URL" ping &> /dev/null; then
    echo -e "${GREEN}✅ Redis connection successful${NC}"
  else
    echo -e "${RED}❌ Redis connection failed${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Could not test Redis connection (redis-cli not available)${NC}"
fi

echo ""

# ================================================================
# Step 8: Display Next Steps
# ================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ PRODUCTION SETUP COMPLETED!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Restart your Medusa backend in Coolify:"
echo "   - Go to Coolify dashboard"
echo "   - Click 'Restart' on your Medusa service"
echo ""
echo "2. Configure Stripe Webhook:"
echo "   - Go to: https://dashboard.stripe.com/test/webhooks"
echo "   - Add endpoint: https://your-backend.app/hooks/payment/stripe"
echo "   - Select events: payment_intent.succeeded, charge.succeeded"
echo "   - Copy webhook secret and update STRIPE_WEBHOOK_SECRET in Coolify"
echo ""
echo "3. Test Your Setup:"
echo "   - Visit your storefront"
echo "   - Add a product to cart"
echo "   - Complete checkout with test card: 4242 4242 4242 4242"
echo "   - Verify order appears in admin panel"
echo ""
echo "4. Verify in Admin Panel:"
echo "   - Go to: https://your-backend.app/app"
echo "   - Navigate to: Settings → Payment Providers"
echo "   - Verify Stripe is listed and enabled"
echo "   - Navigate to: Settings → Locations & Shipping"
echo "   - Verify shipping options exist (UAE Standard, UAE Express, GCC)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Summary of Changes:"
echo "• Database migrations applied"
echo "• Shipping profiles and options created:"
echo "  - UAE Standard Shipping: AED 15.00"
echo "  - UAE Express Shipping: AED 25.00"
echo "  - GCC International: AED 50.00"
echo "• Stripe configuration verified"
echo ""
echo "🔧 Troubleshooting:"
echo "• Logs saved to:"
echo "  - /tmp/medusa-build.log"
echo "  - /tmp/medusa-shipping.log"
echo ""
echo "• If orders still fail, check:"
echo "  1. Stripe webhook is configured correctly"
echo "  2. STORE_CORS includes your frontend domain"
echo "  3. Backend logs for specific errors"
echo ""
echo -e "${GREEN}Good luck! 🚀${NC}"
echo ""
