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
  // const salesChannelModuleService = modules[Modules.SALES_CHANNEL]; // Unused
  const stockLocationModuleService = modules[Modules.STOCK_LOCATION];

  try {
    console.log("Setting up shipping options for UAE and GCC...");

    // Get the UAE region
    const regions = await regionModuleService.listRegions();
    const uaeRegion = regions.find((r: any) => r.name.includes("United Arab Emirates"));
    
    if (!uaeRegion) {
      console.error("UAE region not found");
      return;
    }

    console.log("Found UAE region:", uaeRegion.id);

    // Get stock location
    const stockLocations = await stockLocationModuleService.listStockLocations();
    const sharjahLocation = stockLocations.find((loc: any) => 
      loc.name.includes("Sharjah") || loc.name.includes("Warehouse")
    );

    if (!sharjahLocation) {
      console.error("Stock location not found");
      return;
    }

    console.log("Found stock location:", sharjahLocation.id);

    // Create fulfillment set for UAE/GCC shipping
    const fulfillmentSets = await fulfillmentModuleService.listFulfillmentSets();
    let fulfillmentSet = fulfillmentSets.find((set: any) => 
      set.name === "UAE & GCC Shipping"
    );

    if (!fulfillmentSet) {
      fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
        name: "UAE & GCC Shipping",
        type: "shipping",
      });
      console.log("Created fulfillment set:", fulfillmentSet.id);
    } else {
      console.log("Found existing fulfillment set:", fulfillmentSet.id);
    }

    // Create service zones for UAE and GCC
    // const uaeCountries = ["ae"]; // United Arab Emirates - unused
    const gccCountries = ["sa", "kw", "bh", "qa", "om"]; // Saudi, Kuwait, Bahrain, Qatar, Oman

    // UAE Service Zone
    let uaeServiceZone = await fulfillmentModuleService.listServiceZones({
      fulfillment_set_id: fulfillmentSet.id,
    }).then((zones: any) => zones.find((z: any) => z.name === "UAE"));

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
      console.log("Created UAE service zone:", uaeServiceZone.id);
    }

    // GCC Service Zone
    let gccServiceZone = await fulfillmentModuleService.listServiceZones({
      fulfillment_set_id: fulfillmentSet.id,
    }).then((zones: any) => zones.find((z: any) => z.name === "GCC Countries"));

    if (!gccServiceZone) {
      gccServiceZone = await fulfillmentModuleService.createServiceZones({
        name: "GCC Countries",
        fulfillment_set_id: fulfillmentSet.id,
        geo_zones: gccCountries.map(code => ({
          type: "country",
          country_code: code,
        })),
      });
      console.log("Created GCC service zone:", gccServiceZone.id);
    }

    // Create shipping options
    // UAE Standard Shipping - AED 15
    const uaeShippingOptions = await fulfillmentModuleService.listShippingOptions({
      service_zone_id: uaeServiceZone.id,
    });

    if (uaeShippingOptions.length === 0) {
      await fulfillmentModuleService.createShippingOptions({
        name: "Standard Shipping (UAE)",
        service_zone_id: uaeServiceZone.id,
        shipping_profile_id: "sp_01HZGJC4H1C5DQXSQMGH6E3XM5", // Default profile
        provider_id: "manual",
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
      console.log("Created UAE standard shipping option");
    }

    // GCC International Shipping - AED 50
    const gccShippingOptions = await fulfillmentModuleService.listShippingOptions({
      service_zone_id: gccServiceZone.id,
    });

    if (gccShippingOptions.length === 0) {
      await fulfillmentModuleService.createShippingOptions({
        name: "International Shipping (GCC)",
        service_zone_id: gccServiceZone.id,
        shipping_profile_id: "sp_01HZGJC4H1C5DQXSQMGH6E3XM5",
        provider_id: "manual",
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
      console.log("Created GCC international shipping option");
    }

    console.log("✅ Shipping setup completed successfully!");
    console.log("- UAE Standard Shipping: AED 15.00 (2-3 days)");
    console.log("- GCC International Shipping: AED 50.00 (5-7 days)");

  } catch (error) {
    console.error("Error setting up shipping:", error);
    throw error;
  }
}
