# 🚀 Production Setup - FIXED VERSION

## 🔍 Problem Identified

The error **"Payment providers with ids pp_stripe not found or not enabled"** occurs because:

1. `medusa exec` runs scripts WITHOUT fully initializing payment modules
2. The Stripe provider (pp_stripe) only gets registered when the **Medusa server actually runs**
3. The production-setup script tried to assign Stripe to the region before the server started

---

## ✅ Solution Applied

I've updated `production-setup.ts` to:

- ✅ Skip payment provider assignment during script execution
- ✅ Create the UAE region without payment providers
- ✅ Instruct you to add Stripe via Admin UI after server starts

---

## 🚀 Run This Now

```bash
# In your Coolify terminal:
cd /app
npm run production-setup
```

This will now succeed and create:

- ✅ Store configuration
- ✅ UAE Region (without payment provider initially)
- ✅ Stock location
- ✅ Sales channel
- ✅ Shipping options with prices
- ✅ Tax regions

---

## 📋 After Script Completes

### Step 1: Restart Medusa Service

In Coolify dashboard, click **"Restart"** on your Medusa service.

This ensures the Stripe module is fully loaded.

### Step 2: Add Stripe to UAE Region via Admin UI

1. Go to: `https://adminvigo.app/app`
2. Navigate to: **Settings** → **Regions**
3. Click on **"United Arab Emirates"**
4. Scroll to **"Payment Providers"** section
5. Click **"Add payment provider"** or **"Edit"**
6. Select **"Stripe"** from the dropdown
7. Click **"Save"**

### Step 3: Verify Locations & Shipping

1. Navigate to: **Settings** → **Locations & Shipping**
2. You should see:
   - ✅ **UAE Warehouse - Sharjah**
   - ✅ Three shipping options with prices:
     - Standard Shipping (UAE) - AED 15.00
     - Express Shipping (UAE) - AED 25.00
     - International Shipping (GCC) - AED 50.00

### Step 4: Test Order Flow

1. Go to your storefront
2. Add product to cart
3. Checkout with Stripe test card: `4242 4242 4242 4242`
4. Complete payment
5. ✅ Order should show proper number (e.g., `#45`)
6. ✅ Order should appear in admin panel

---

## 🎯 Why This Works

**Before (Failed):**

```
medusa exec script.ts → Tries to use pp_stripe → Not loaded yet → ERROR
```

**After (Success):**

```
medusa exec script.ts → Creates region WITHOUT payment provider → SUCCESS
↓
Server starts → Stripe module loads → pp_stripe available
↓
Admin adds Stripe to region via UI → SUCCESS
```

---

## 📸 Visual Guide: Adding Stripe in Admin

After running the script and restarting:

1. **Navigate to Regions**

   ```
   Admin Panel → Settings → Regions → United Arab Emirates
   ```

2. **Find Payment Providers Section**
   - Look for a section labeled "Payment Providers"
   - Should currently be empty or show "No payment providers"

3. **Add Stripe**
   - Click "Add payment provider" button
   - Select "Stripe" from dropdown
   - Click "Save"

4. **Verify**
   - Stripe should now appear in the UAE region's payment providers list
   - You should see "pp_stripe" or "Stripe" enabled

---

## 🔧 Alternative: Manual Database Update (Advanced)

If you prefer SQL, you can add the payment provider directly:

```sql
-- Get the UAE region ID
SELECT id, name FROM region WHERE currency_code = 'aed';

-- Add Stripe to the region (replace <region_id> with actual ID)
INSERT INTO region_payment_provider (region_id, payment_provider_id)
VALUES ('<region_id>', 'pp_stripe');
```

But using Admin UI is safer and recommended.

---

## ✅ Success Checklist

After completing all steps:

- [ ] `npm run production-setup` completed successfully
- [ ] Medusa service restarted in Coolify
- [ ] Admin panel shows UAE region
- [ ] Stripe added to UAE region via Admin UI
- [ ] Locations & Shipping shows 3 options with prices
- [ ] Test order completes successfully
- [ ] Order shows proper number (not Stripe ID)
- [ ] Order appears in admin panel
- [ ] Email confirmation sent (if configured)

---

## 🆘 If Still Having Issues

### Issue: "No regions visible in Admin"

**Solution:** The script probably failed. Check the output. If you see:

```
✓ Created UAE region (AED)
```

Then it worked. If not, share the error.

### Issue: "Can't add Stripe in Admin UI"

**Possible causes:**

1. Server not restarted after script ran
2. Environment variables missing (STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET)
3. Stripe module didn't load

**Check:**

```bash
# SSH into Coolify terminal
echo "Stripe API Key: $STRIPE_API_KEY"
echo "Stripe Webhook: $STRIPE_WEBHOOK_SECRET"

# Both should output the keys, not empty
```

**Fix:**

1. Add missing env vars in Coolify
2. Restart service
3. Try again in Admin UI

### Issue: "Stripe webhook still failing"

**Verify webhook configuration:**

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Ensure endpoint exists: `https://adminvigo.app/hooks/payment/stripe`
3. Check "Recent deliveries" - should show successful deliveries (green ✅)
4. If red ❌, click to see error details

**Common webhook errors:**

- 404: Wrong URL (check your backend URL)
- 401: Wrong webhook secret
- 500: Server error (check backend logs)

---

## 📝 Summary

**What Changed:**

- ✅ Modified `production-setup.ts` to skip payment provider assignment
- ✅ Stripe must now be added via Admin UI after server starts
- ✅ This avoids the "pp_stripe not found" error

**Why This is Better:**

- More reliable (payment modules are fully loaded)
- Matches Medusa best practices
- Easier to troubleshoot (UI shows what's available)

---

**Run the script now and let me know the output! 🎉**
