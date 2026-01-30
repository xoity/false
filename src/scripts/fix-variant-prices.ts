import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * This script fixes variants that don't have price sets linked.
 * When products are created via the admin UI, variants may not have
 * price sets initialized, causing the "Edit Prices" dialog to crash
 * with "variant.prices is undefined" error.
 *
 * Run: medusa exec ./src/scripts/fix-variant-prices.ts
 */
export default async function fixVariantPrices({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const pricingModule = container.resolve(Modules.PRICING);
  const linkModule = container.resolve(ContainerRegistrationKeys.LINK);

  try {
    logger.info("=== Fixing Variant Prices ===");
    logger.info("Finding variants without price sets...");

    // Get all product variants with their price information
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "variants.id",
        "variants.title",
        "variants.sku",
        "variants.prices.id",
        "variants.prices.amount",
        "variants.prices.currency_code",
      ],
    });

    if (!products || products.length === 0) {
      logger.info("No products found.");
      return;
    }

    let fixedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      const variants = product.variants || [];

      for (const variant of variants) {
        // Cast to any to access dynamically loaded prices field from graph query
        const variantData = variant as any;
        // Check if variant has prices (if prices is undefined or empty array without price_set)
        const hasPrices =
          variantData.prices && Array.isArray(variantData.prices) && variantData.prices.length > 0;

        if (!hasPrices) {
          try {
            logger.info(
              `  Fixing variant: ${variant.title || variant.sku || variant.id} (Product: ${product.title})`
            );

            // Create an empty price set for the variant
            const priceSet = await pricingModule.createPriceSets({
              prices: [],
            });

            logger.info(`    ✓ Created empty price set: ${priceSet.id}`);

            // Link the price set to the variant
            await linkModule.create({
              [Modules.PRODUCT]: {
                variant_id: variant.id,
              },
              [Modules.PRICING]: {
                price_set_id: priceSet.id,
              },
            });

            logger.info(`    ✓ Linked price set to variant`);
            fixedCount++;
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes("already exists") || msg.includes("duplicate")) {
              logger.info(`    ⊘ Price set link already exists`);
              skippedCount++;
            } else {
              logger.warn(`    ⚠ Failed to fix variant: ${msg}`);
            }
          }
        } else {
          skippedCount++;
        }
      }
    }

    logger.info("\n=== Summary ===");
    logger.info(`Fixed: ${fixedCount} variants`);
    logger.info(`Skipped: ${skippedCount} variants (already have prices)`);
    logger.info("=== ✓ Variant prices fix complete! ===");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error(`Error: ${msg}`);
    if (stack) logger.error(stack);
    throw error as Error;
  }
}
