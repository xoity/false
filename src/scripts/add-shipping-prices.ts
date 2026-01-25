// @ts-nocheck
import { MedusaApp } from "@medusajs/framework/modules-sdk";
import { Modules } from "@medusajs/framework/utils";

export default async function addShippingPrices() {
  const { modules } = await MedusaApp({
    modulesConfig: {
      [Modules.FULFILLMENT]: true,
      [Modules.REGION]: true,
    },
  });

  const fulfillmentModuleService = modules[Modules.FULFILLMENT];
  const regionModuleService = modules[Modules.REGION];

  try {
    console.log("Adding prices to shipping options...\n");

    // Get the UAE region to get currency
    const regions = await regionModuleService.listRegions();
    const uaeRegion = regions.find(
      (r: any) => r.name.includes("United Arab Emirates") || r.currency_code === "aed"
    );

    if (!uaeRegion) {
      console.error("❌ UAE region not found");
      return;
    }

    const currencyCode = uaeRegion.currency_code;
    console.log(`✓ Using currency: ${currencyCode.toUpperCase()}\n`);

    // Get all shipping options
    const allShippingOptions = await fulfillmentModuleService.listShippingOptions();

    if (allShippingOptions.length === 0) {
      console.log("❌ No shipping options found!");
      return;
    }

    // Define prices for each shipping option
    const priceMap: Record<string, number> = {
      STANDARD: 1500, // AED 15.00 in cents
      EXPRESS: 2500, // AED 25.00 in cents
      INTERNATIONAL: 5000, // AED 50.00 in cents
    };

    for (const option of allShippingOptions) {
      const optionName = option.name.toUpperCase();
      let priceAmount: number = 1500; // Default to AED 15.00

      // Determine price based on option name
      if (optionName.includes("EXPRESS")) {
        priceAmount = priceMap["EXPRESS"] || 2500;
      } else if (optionName.includes("INTERNATIONAL") || optionName.includes("GCC")) {
        priceAmount = priceMap["INTERNATIONAL"] || 5000;
      } else if (optionName.includes("STANDARD")) {
        priceAmount = priceMap["STANDARD"] || 1500;
      }

      // Check if option already has prices
      if (option.prices && option.prices.length > 0) {
        console.log(`⊙ ${option.name} - Already has prices, skipping`);
        continue;
      }

      // Update shipping option with price
      try {
        await fulfillmentModuleService.updateShippingOptions(option.id, {
          prices: [
            {
              currency_code: currencyCode,
              amount: priceAmount,
            },
          ],
        });

        console.log(
          `✓ ${option.name} - Added price: ${currencyCode.toUpperCase()} ${(priceAmount / 100).toFixed(2)}`
        );
      } catch (updateError: any) {
        console.error(`❌ Failed to update ${option.name}:`, updateError.message);
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Shipping prices updated successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Verify by listing again
    const updatedOptions = await fulfillmentModuleService.listShippingOptions();
    console.log("Current shipping options:\n");

    for (const option of updatedOptions) {
      console.log(`📦 ${option.name}`);
      if (option.prices && option.prices.length > 0) {
        for (const price of option.prices) {
          console.log(
            `   • ${price.currency_code.toUpperCase()}: ${(price.amount / 100).toFixed(2)}`
          );
        }
      } else {
        console.log(`   ⚠ No prices!`);
      }
    }
    console.log("");
  } catch (error) {
    console.error("❌ Error adding shipping prices:", error);
    throw error;
  }
}
