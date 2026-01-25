import { MedusaApp } from "@medusajs/framework/modules-sdk";
import { Modules } from "@medusajs/framework/utils";

export default async function fixShippingPrices() {
  const { modules } = await MedusaApp({
    modulesConfig: {
      [Modules.FULFILLMENT]: true,
    },
  });

  const fulfillmentModuleService = modules[Modules.FULFILLMENT];

  try {
    console.log("Checking existing shipping options...\n");

    // Get all shipping options
    const allShippingOptions = await fulfillmentModuleService.listShippingOptions();

    if (allShippingOptions.length === 0) {
      console.log("❌ No shipping options found!");
      console.log("\nPlease ensure shipping options are created first.");
      console.log("You may need to run this from the Medusa Admin panel.\n");
      return;
    }

    console.log(`Found ${allShippingOptions.length} shipping option(s):\n`);

    for (const option of allShippingOptions) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 ${option.name}`);
      console.log(`   ID: ${option.id}`);
      console.log(`   Provider: ${option.provider_id}`);
      console.log(`   Service Zone: ${option.service_zone_id}`);

      if (option.prices && option.prices.length > 0) {
        console.log(`   ✓ Prices configured:`);
        for (const price of option.prices) {
          const amount = (price.amount / 100).toFixed(2);
          console.log(`      • ${price.currency_code.toUpperCase()}: ${amount}`);
        }
      } else {
        console.log(`   ⚠ WARNING: No prices configured!`);
        console.log(`      This shipping option will not work until prices are added.`);
      }
      console.log(``);
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Count options with missing prices
    const missingPrices = allShippingOptions.filter(
      (opt: any) => !opt.prices || opt.prices.length === 0
    );

    if (missingPrices.length > 0) {
      console.log(`\n⚠ ${missingPrices.length} shipping option(s) missing prices!\n`);
      console.log(`To fix this:`);
      console.log(`1. Go to Medusa Admin: http://localhost:9000/admin`);
      console.log(`2. Navigate to Settings > Locations > Shipping Options`);
      console.log(`3. Edit each shipping option and add prices`);
      console.log(`4. Make sure to set the price in cents (e.g., 1500 for AED 15.00)\n`);
    } else {
      console.log(`\n✅ All shipping options have prices configured!\n`);
    }
  } catch (error) {
    console.error("❌ Error checking shipping options:", error);
    throw error;
  }
}
