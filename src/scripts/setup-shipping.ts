// @ts-nocheck
import { MedusaApp } from "@medusajs/framework/modules-sdk";
import { Modules } from "@medusajs/framework/utils";

export default async function setupShipping() {
  const { modules } = await MedusaApp({
    modulesConfig: {
      [Modules.FULFILLMENT]: true,
      [Modules.REGION]: true,
      [Modules.SALES_CHANNEL]: true,
      [Modules.STOCK_LOCATION]: true,
    },
  });

  const fulfillmentModuleService = modules[Modules.FULFILLMENT];
  const regionModuleService = modules[Modules.REGION];
  const stockLocationModuleService = modules[Modules.STOCK_LOCATION];

  try {
    console.log("Setting up shipping options for UAE and GCC...");

    // Get all regions
    const regions = await regionModuleService.listRegions();
    console.log(
      "Available regions:",
      regions.map((r: any) => `${r.name} (${r.currency_code})`)
    );

    const uaeRegion = regions.find(
      (r: any) => r.name.includes("United Arab Emirates") || r.currency_code === "aed"
    );

    if (!uaeRegion) {
      console.error(
        "UAE region not found. Available regions:",
        regions.map((r: any) => r.name)
      );
      return;
    }

    console.log("✓ Found UAE region:", uaeRegion.id, "-", uaeRegion.name);

    // Get stock location
    const stockLocations = await stockLocationModuleService.listStockLocations();
    console.log(
      "Available stock locations:",
      stockLocations.map((l: any) => l.name)
    );

    const stockLocation =
      stockLocations.find(
        (loc: any) =>
          loc.name.includes("Sharjah") ||
          loc.name.includes("Warehouse") ||
          loc.name.includes("Main")
      ) || stockLocations[0]; // Fallback to first location

    if (!stockLocation) {
      console.error("No stock location found");
      return;
    }

    console.log("✓ Using stock location:", stockLocation.id, "-", stockLocation.name);

    // Create fulfillment set for UAE/GCC shipping
    const fulfillmentSets = await fulfillmentModuleService.listFulfillmentSets();
    let fulfillmentSet = fulfillmentSets.find((set: any) => set.name === "UAE & GCC Shipping");

    if (!fulfillmentSet) {
      fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
        name: "UAE & GCC Shipping",
        type: "shipping",
      });
      console.log("✓ Created fulfillment set:", fulfillmentSet.id);
    } else {
      console.log("✓ Found existing fulfillment set:", fulfillmentSet.id);
    }

    // Create service zones for UAE and GCC
    const gccCountries = ["sa", "kw", "bh", "qa", "om"]; // Saudi, Kuwait, Bahrain, Qatar, Oman

    // UAE Service Zone - Get all zones and find UAE
    const allServiceZones = await fulfillmentModuleService.listServiceZones({
      fulfillment_set_id: fulfillmentSet.id,
    });

    let uaeServiceZone = allServiceZones.find(
      (z: any) => z.name === "UAE" || z.name.includes("UAE")
    );

    if (!uaeServiceZone) {
      uaeServiceZone = await fulfillmentModuleService.createServiceZones({
        name: "UAE",
        fulfillment_set_id: fulfillmentSet.id,
        geo_zones: [
          {
            type: "country",
            country_code: "ae",
          },
        ],
      });
      console.log("✓ Created UAE service zone:", uaeServiceZone.id);
    } else {
      console.log("✓ Found existing UAE service zone:", uaeServiceZone.id);
    }

    // GCC Service Zone
    let gccServiceZone = allServiceZones.find(
      (z: any) => z.name === "GCC Countries" || z.name.includes("GCC")
    );

    if (!gccServiceZone) {
      gccServiceZone = await fulfillmentModuleService.createServiceZones({
        name: "GCC Countries",
        fulfillment_set_id: fulfillmentSet.id,
        geo_zones: gccCountries.map((code) => ({
          type: "country",
          country_code: code,
        })),
      });
      console.log("✓ Created GCC service zone:", gccServiceZone.id);
    } else {
      console.log("✓ Found existing GCC service zone:", gccServiceZone.id);
    }

    // Get default shipping profile
    const shippingProfiles = await fulfillmentModuleService.listShippingProfiles();
    const defaultProfile =
      shippingProfiles.find((p: any) => p.name === "Default" || p.is_default) ||
      shippingProfiles[0];

    if (!defaultProfile) {
      console.error("No shipping profile found");
      return;
    }

    console.log("✓ Using shipping profile:", defaultProfile.id, "-", defaultProfile.name);

    // Create or update shipping options
    // UAE Standard Shipping - AED 15.00
    const uaeShippingOptions = await fulfillmentModuleService.listShippingOptions({
      service_zone_id: uaeServiceZone.id,
    });

    let uaeStandardOption = uaeShippingOptions.find(
      (opt: any) => opt.name.includes("Standard") && opt.name.includes("UAE")
    );

    if (!uaeStandardOption) {
      uaeStandardOption = await fulfillmentModuleService.createShippingOptions({
        name: "Standard Shipping (UAE)",
        service_zone_id: uaeServiceZone.id,
        shipping_profile_id: defaultProfile.id,
        provider_id: "manual_manual", // Changed from "manual" to "manual_manual"
        price_type: "flat",
        type: {
          label: "Standard",
          description: "Delivery within 2-3 business days",
          code: "standard",
        },
        prices: [
          {
            currency_code: "aed",
            amount: 1500, // AED 15.00 in cents
          },
        ],
      });
      console.log("✓ Created UAE standard shipping option:", uaeStandardOption.id, "- AED 15.00");
    } else {
      console.log("✓ Found existing UAE standard shipping option:", uaeStandardOption.id);
      // Verify prices
      if (!uaeStandardOption.prices || uaeStandardOption.prices.length === 0) {
        console.warn("⚠ UAE standard shipping option has no prices! ID:", uaeStandardOption.id);
      } else {
        const price = uaeStandardOption.prices.find((p: any) => p.currency_code === "aed");
        if (price) {
          console.log("  Price: AED", (price.amount / 100).toFixed(2));
        }
      }
    }

    // UAE Express Shipping - AED 25.00
    let uaeExpressOption = uaeShippingOptions.find(
      (opt: any) => opt.name.includes("Express") && opt.name.includes("UAE")
    );

    if (!uaeExpressOption) {
      uaeExpressOption = await fulfillmentModuleService.createShippingOptions({
        name: "Express Shipping (UAE)",
        service_zone_id: uaeServiceZone.id,
        shipping_profile_id: defaultProfile.id,
        provider_id: "manual_manual",
        price_type: "flat",
        type: {
          label: "Express",
          description: "Next-day delivery",
          code: "express",
        },
        prices: [
          {
            currency_code: "aed",
            amount: 2500, // AED 25.00 in cents
          },
        ],
      });
      console.log("✓ Created UAE express shipping option:", uaeExpressOption.id, "- AED 25.00");
    } else {
      console.log("✓ Found existing UAE express shipping option:", uaeExpressOption.id);
    }

    // GCC International Shipping - AED 50.00
    const gccShippingOptions = await fulfillmentModuleService.listShippingOptions({
      service_zone_id: gccServiceZone.id,
    });

    let gccOption = gccShippingOptions.find((opt: any) => opt.name.includes("GCC"));

    if (!gccOption) {
      gccOption = await fulfillmentModuleService.createShippingOptions({
        name: "International Shipping (GCC)",
        service_zone_id: gccServiceZone.id,
        shipping_profile_id: defaultProfile.id,
        provider_id: "manual_manual",
        price_type: "flat",
        type: {
          label: "International",
          description: "Delivery within 5-7 business days",
          code: "international",
        },
        prices: [
          {
            currency_code: "aed",
            amount: 5000, // AED 50.00 in cents
          },
        ],
      });
      console.log("✓ Created GCC international shipping option:", gccOption.id, "- AED 50.00");
    } else {
      console.log("✓ Found existing GCC international shipping option:", gccOption.id);
    }

    console.log("\n✅ Shipping setup completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📦 UAE Shipping Options:");
    console.log("   • Standard: AED 15.00 (2-3 days)");
    console.log("   • Express: AED 25.00 (Next day)");
    console.log("\n🌍 GCC Shipping Options:");
    console.log("   • International: AED 50.00 (5-7 days)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("❌ Error setting up shipping:", error);
    throw error;
  }
}
