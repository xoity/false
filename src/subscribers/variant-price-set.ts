import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Subscriber that automatically creates and links price sets to newly created product variants.
 * This fixes the "variant.prices is undefined" error in the admin dashboard when editing prices
 * for custom-created products.
 */
export default async function variantPriceSetHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const pricingModule = container.resolve(Modules.PRICING);
  const linkModule = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  try {
    const variantId = data.id;

    logger.info(`[variant-price-set] Processing variant: ${variantId}`);

    // Check if variant already has a price set linked
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "title"],
      filters: { id: variantId },
    });

    if (!variants || variants.length === 0) {
      logger.warn(`[variant-price-set] Variant not found: ${variantId}`);
      return;
    }

    const variant = variants[0];

    // Try to check if price set already exists by querying prices
    // We use a try-catch since the variant may not have prices property
    try {
      const { data: variantWithPrices } = await query.graph({
        entity: "product_variant",
        fields: ["id", "prices.id"],
        filters: { id: variantId },
      });

      const variantData = variantWithPrices?.[0] as any;
      if (variantData?.prices && variantData.prices.length > 0) {
        logger.info(`[variant-price-set] Variant ${variantId} already has prices, skipping`);
        return;
      }
    } catch {
      // Prices field doesn't exist or query failed, proceed to create price set
    }

    // Create an empty price set for the variant
    const priceSet = await pricingModule.createPriceSets({
      prices: [],
    });

    logger.info(
      `[variant-price-set] Created price set ${priceSet.id} for variant ${variant?.title || variantId}`
    );

    // Link the price set to the variant
    await linkModule.create({
      [Modules.PRODUCT]: {
        variant_id: variantId,
      },
      [Modules.PRICING]: {
        price_set_id: priceSet.id,
      },
    });

    logger.info(`[variant-price-set] Linked price set to variant ${variant?.title || variantId}`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);

    // Ignore "already exists" errors - the price set link is already there
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      logger.info(`[variant-price-set] Price set link already exists for variant ${data.id}`);
      return;
    }

    logger.error(`[variant-price-set] Error processing variant ${data.id}: ${msg}`);
  }
}

export const config: SubscriberConfig = {
  event: ["product_variant.created", "product.created", "product.updated"],
};
