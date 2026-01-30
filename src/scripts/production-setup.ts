import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";

/**
 * Complete Production Setup Script
 *
 * This script sets up your Medusa production environment to match localhost:
 * - Admin user with credentials from env vars
 * - UAE region with AED currency
 * - Stock location (Sharjah/UAE warehouse)
 * - Sales channels
 * - Shipping profiles, zones, and options with prices
 * - Payment provider (Stripe) configuration
 *
 * Run with: pnpm run production-setup
 *
 * Environment variables required:
 * - ADMIN_EMAIL
 * - ADMIN_PASSWORD
 * - STRIPE_API_KEY
 * - DATABASE_URL
 * - REDIS_URL
 */

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map((currency) => {
            return {
              currency_code: currency.currency_code,
              is_default: currency.is_default ?? false,
            };
          }),
        },
      };
    });

    const { updateStoresStep } = require("@medusajs/medusa/core-flows");
    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

export default async function productionSetup({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const userModuleService = container.resolve(Modules.USER);
  const authModuleService = container.resolve(Modules.AUTH);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);
  const regionModuleService = container.resolve(Modules.REGION);
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION);

  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  logger.info("🚀 MEDUSA PRODUCTION SETUP");
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // ==========================================
    // 1. CREATE ADMIN USER
    // ==========================================
    logger.info("👤 Step 1: Setting up admin user...");

    const email = process.env.ADMIN_EMAIL || "admin@example.com";
    const password = process.env.ADMIN_PASSWORD || "supersecret";
    const firstName = process.env.ADMIN_FIRST_NAME || "Admin";
    const lastName = process.env.ADMIN_LAST_NAME || "User";

    if (!email || !password) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
    }

    if (password.length < 8) {
      throw new Error("ADMIN_PASSWORD must be at least 8 characters");
    }

    const existingUsers = await userModuleService.listUsers({ email });

    if (existingUsers.length > 0) {
      logger.info(`   ✓ Admin user already exists: ${email}`);
    } else {
      const user = await userModuleService.createUsers({
        email,
        first_name: firstName,
        last_name: lastName,
      });

      const authIdentity = await authModuleService.register("emailpass", {
        entity_id: email,
        provider_metadata: { password },
      } as any);

      await link.create({
        [Modules.USER]: { user_id: user.id },
        [Modules.AUTH]: { auth_identity_id: (authIdentity as any).id },
      });

      logger.info(`   ✓ Created admin user: ${email}`);
    }

    // ==========================================
    // 2. SETUP STORE & CURRENCIES
    // ==========================================
    logger.info("\n🏪 Step 2: Configuring store...");

    const [store] = await storeModuleService.listStores();
    if (!store) throw new Error("Store not found");

    await updateStoreCurrencies(container).run({
      input: {
        store_id: store.id,
        supported_currencies: [
          { currency_code: "aed", is_default: true },
          { currency_code: "usd" },
          { currency_code: "eur" },
        ],
      },
    });

    logger.info("   ✓ Store currencies configured (AED default)");

    // ==========================================
    // 3. CREATE SALES CHANNEL
    // ==========================================
    logger.info("\n📺 Step 3: Setting up sales channel...");

    let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
      name: "Default Sales Channel",
    });

    if (!defaultSalesChannel.length) {
      const { result: salesChannelResult } = await createSalesChannelsWorkflow(container).run({
        input: {
          salesChannelsData: [{ name: "Default Sales Channel" }],
        },
      });
      defaultSalesChannel = salesChannelResult;
      logger.info("   ✓ Created Default Sales Channel");
    } else {
      logger.info("   ✓ Default Sales Channel already exists");
    }

    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { default_sales_channel_id: defaultSalesChannel[0]!.id },
      },
    });

    // ==========================================
    // 4. CREATE UAE REGION
    // ==========================================
    logger.info("\n🇦🇪 Step 4: Setting up UAE region...");

    const { data: existingRegions } = await query.graph({
      entity: "region",
      fields: ["id", "name", "currency_code", "countries"],
    });

    let uaeRegion = (existingRegions || []).find(
      (r: any) => r.currency_code === "aed" || r.name.includes("United Arab Emirates")
    );

    if (!uaeRegion) {
      const { result: regionResult } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "United Arab Emirates",
              currency_code: "aed",
              countries: ["ae"],
              payment_providers: ["pp_stripe"],
            },
          ],
        },
      });
      uaeRegion = regionResult[0];
      logger.info("   ✓ Created UAE region (AED)");
    } else {
      logger.info(`   ✓ UAE region already exists: ${uaeRegion.name}`);
    }

    // Create tax region for UAE
    const { data: existingTaxRegions } = await query.graph({
      entity: "tax_region",
      fields: ["country_code"],
    });

    const hasTaxRegion = (existingTaxRegions || []).some(
      (t: any) => String(t.country_code).toLowerCase() === "ae"
    );

    if (!hasTaxRegion) {
      await createTaxRegionsWorkflow(container).run({
        input: [
          {
            country_code: "ae",
            provider_id: "tp_system",
          },
        ],
      });
      logger.info("   ✓ Created tax region for UAE");
    } else {
      logger.info("   ✓ Tax region for UAE already exists");
    }

    // ==========================================
    // 5. CREATE STOCK LOCATION
    // ==========================================
    logger.info("\n📦 Step 5: Setting up stock location...");

    const { data: existingStockLocations } = await query.graph({
      entity: "stock_location",
      fields: ["id", "name"],
    });

    let stockLocation = (existingStockLocations || []).find(
      (loc: any) =>
        loc.name.includes("Sharjah") || loc.name.includes("UAE") || loc.name.includes("Warehouse")
    );

    if (!stockLocation) {
      const { result: stockLocationResult } = await createStockLocationsWorkflow(container).run({
        input: {
          locations: [
            {
              name: "UAE Warehouse - Sharjah",
              address: {
                city: "Sharjah",
                country_code: "ae",
                address_1: "Main Warehouse",
              },
            },
          ],
        },
      });
      stockLocation = stockLocationResult[0];
      logger.info("   ✓ Created stock location: UAE Warehouse - Sharjah");
    } else {
      logger.info(`   ✓ Stock location already exists: ${stockLocation.name}`);
    }

    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { default_location_id: stockLocation.id },
      },
    });

    // Link stock location to fulfillment provider
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
      });
    } catch (err: any) {
      if (!err?.message?.includes("already exists")) {
        throw err;
      }
    }

    // ==========================================
    // 6. CREATE SHIPPING PROFILE
    // ==========================================
    logger.info("\n🚚 Step 6: Setting up shipping profiles...");

    const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
      type: "default",
    });
    let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

    if (!shippingProfile) {
      const { result: shippingProfileResult } = await createShippingProfilesWorkflow(container).run(
        {
          input: {
            data: [
              {
                name: "Default Shipping Profile",
                type: "default",
              },
            ],
          },
        }
      );
      shippingProfile = shippingProfileResult[0];
      logger.info("   ✓ Created Default Shipping Profile");
    } else {
      logger.info("   ✓ Default Shipping Profile already exists");
    }

    // ==========================================
    // 7. CREATE FULFILLMENT SETS & SERVICE ZONES
    // ==========================================
    logger.info("\n🌍 Step 7: Setting up fulfillment sets and service zones...");

    const { data: existingFulfillmentSets } = await query.graph({
      entity: "fulfillment_set",
      fields: ["id", "name", "service_zones"],
    });

    let fulfillmentSet = (existingFulfillmentSets || []).find(
      (fs: any) => fs.name === "UAE & GCC Shipping"
    );

    if (!fulfillmentSet) {
      fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
        name: "UAE & GCC Shipping",
        type: "shipping",
        service_zones: [
          {
            name: "UAE",
            geo_zones: [{ country_code: "ae", type: "country" }],
          },
          {
            name: "GCC Countries",
            geo_zones: [
              { country_code: "sa", type: "country" },
              { country_code: "kw", type: "country" },
              { country_code: "bh", type: "country" },
              { country_code: "qa", type: "country" },
              { country_code: "om", type: "country" },
            ],
          },
        ],
      });
      logger.info("   ✓ Created fulfillment set: UAE & GCC Shipping");
      logger.info("   ✓ Created service zone: UAE");
      logger.info("   ✓ Created service zone: GCC Countries");
    } else {
      logger.info("   ✓ Fulfillment set already exists: UAE & GCC Shipping");
    }

    // Link stock location to fulfillment set
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
      });
    } catch (err: any) {
      if (!err?.message?.includes("already exists")) {
        throw err;
      }
    }

    // Get service zone IDs
    const allServiceZones = await fulfillmentModuleService.listServiceZones({
      fulfillment_set_id: fulfillmentSet.id,
    });

    const uaeServiceZone = allServiceZones.find(
      (z: any) => z.name === "UAE" || z.name.includes("UAE")
    );
    const gccServiceZone = allServiceZones.find(
      (z: any) => z.name === "GCC Countries" || z.name.includes("GCC")
    );

    if (!uaeServiceZone || !gccServiceZone) {
      throw new Error("Service zones not found after creation");
    }

    // ==========================================
    // 8. CREATE SHIPPING OPTIONS WITH PRICES
    // ==========================================
    logger.info("\n💰 Step 8: Setting up shipping options with prices...");

    const { data: existingShippingOptions } = await query.graph({
      entity: "shipping_option",
      fields: ["id", "name", "service_zone_id"],
    });

    const existingOptionNames = new Set(
      (existingShippingOptions || []).map((opt: any) => String(opt.name).toLowerCase())
    );

    const shippingOptionsToCreate = [];

    // UAE Standard Shipping - AED 15.00
    if (!existingOptionNames.has("standard shipping (uae)")) {
      shippingOptionsToCreate.push({
        name: "Standard Shipping (UAE)",
        price_type: "flat" as const,
        provider_id: "manual_manual",
        service_zone_id: uaeServiceZone.id,
        shipping_profile_id: shippingProfile!.id,
        type: {
          label: "Standard",
          description: "Delivery within 2-3 business days",
          code: "standard",
        },
        prices: [
          {
            currency_code: "aed",
            amount: 1500, // AED 15.00
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq" as any,
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq" as any,
          },
        ],
      });
    }

    // UAE Express Shipping - AED 25.00
    if (!existingOptionNames.has("express shipping (uae)")) {
      shippingOptionsToCreate.push({
        name: "Express Shipping (UAE)",
        price_type: "flat" as const,
        provider_id: "manual_manual",
        service_zone_id: uaeServiceZone.id,
        shipping_profile_id: shippingProfile!.id,
        type: {
          label: "Express",
          description: "Next-day delivery",
          code: "express",
        },
        prices: [
          {
            currency_code: "aed",
            amount: 2500, // AED 25.00
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq" as any,
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq" as any,
          },
        ],
      });
    }

    // GCC International Shipping - AED 50.00
    if (!existingOptionNames.has("international shipping (gcc)")) {
      shippingOptionsToCreate.push({
        name: "International Shipping (GCC)",
        price_type: "flat" as const,
        provider_id: "manual_manual",
        service_zone_id: gccServiceZone.id,
        shipping_profile_id: shippingProfile!.id,
        type: {
          label: "International",
          description: "Delivery within 5-7 business days",
          code: "international",
        },
        prices: [
          {
            currency_code: "aed",
            amount: 5000, // AED 50.00
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq" as any,
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq" as any,
          },
        ],
      });
    }

    if (shippingOptionsToCreate.length > 0) {
      await createShippingOptionsWorkflow(container).run({
        input: shippingOptionsToCreate,
      });
      logger.info(`   ✓ Created ${shippingOptionsToCreate.length} shipping options with prices`);
    } else {
      logger.info("   ✓ All shipping options already exist");

      // Verify existing options have prices
      const allOptions = await fulfillmentModuleService.listShippingOptions(
        {},
        {
          relations: ["prices"],
        }
      );

      for (const option of allOptions) {
        if (!option.prices || option.prices.length === 0) {
          logger.warn(`   ⚠ Warning: ${option.name} has no prices!`);
        }
      }
    }

    // ==========================================
    // 9. LINK SALES CHANNEL TO STOCK LOCATION
    // ==========================================
    logger.info("\n🔗 Step 9: Linking sales channel to stock location...");

    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel[0]!.id],
      },
    });
    logger.info("   ✓ Linked Default Sales Channel to stock location");

    // ==========================================
    // FINAL SUMMARY
    // ==========================================
    logger.info("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info("✅ PRODUCTION SETUP COMPLETE!");
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    logger.info("📋 Configuration Summary:");
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info(`👤 Admin User: ${email}`);
    logger.info(`🏪 Store ID: ${store.id}`);
    logger.info(`💱 Default Currency: AED`);
    logger.info(`🇦🇪 Region: ${uaeRegion.name} (${uaeRegion.id})`);
    logger.info(`📦 Stock Location: ${stockLocation.name} (${stockLocation.id})`);
    logger.info(`📺 Sales Channel: ${defaultSalesChannel[0]!.name}`);
    logger.info(`\n🚚 Shipping Options:`);
    logger.info(`   • UAE Standard: AED 15.00 (2-3 days)`);
    logger.info(`   • UAE Express: AED 25.00 (Next day)`);
    logger.info(`   • GCC International: AED 50.00 (5-7 days)`);
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";
    logger.info(`🔗 Admin Panel: ${backendUrl}/app\n`);

    logger.info("Next steps:");
    logger.info("  1. Verify payment provider (Stripe) is configured in Admin UI");
    logger.info("  2. Test order creation from frontend");
    logger.info("  3. Monitor backend logs for any issues\n");
  } catch (error: any) {
    logger.error("\n❌ Setup failed:", error.message);
    if (error.stack) {
      logger.error(error.stack);
    }
    throw error;
  }
}
