import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Middleware that ensures product variants have price sets when viewing variant prices.
 * Only runs on specific variant price endpoints to avoid performance impact.
 */
export async function ensureVariantPriceSet(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  // Only run for variant detail requests (when editing prices)
  const variantPricePattern = /\/admin\/products\/.+\/variants\/.+\/prices/;
  const variantDetailPattern = /\/admin\/products\/.+\/variants\/.+$/;

  if (!variantPricePattern.test(req.url) && !variantDetailPattern.test(req.url)) {
    return next();
  }

  try {
    const container = req.scope;
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const pricingModule = container.resolve(Modules.PRICING);
    const linkModule = container.resolve(ContainerRegistrationKeys.LINK);

    // Extract variant ID from URL
    const matches = req.url.match(/variants\/([^\/]+)/);
    if (!matches || !matches[1]) {
      return next();
    }

    const variantId = matches[1].split("?")[0]; // Remove query params

    // Check if this variant has prices
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "title", "prices.id"],
      filters: { id: variantId },
    });

    if (!variants || variants.length === 0) {
      return next();
    }

    const variant = variants[0] as any;
    const hasPrices = variant.prices && Array.isArray(variant.prices) && variant.prices.length > 0;

    if (!hasPrices) {
      logger.info(`[middleware] Creating price set for variant ${variantId}`);

      try {
        const priceSet = await pricingModule.createPriceSets({
          prices: [],
        });

        await linkModule.create({
          [Modules.PRODUCT]: {
            variant_id: variantId,
          },
          [Modules.PRICING]: {
            price_set_id: priceSet.id,
          },
        });

        logger.info(`[middleware] ✓ Created price set for variant ${variantId}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.includes("already exists") && !msg.includes("duplicate")) {
          logger.warn(`[middleware] Failed to create price set: ${msg}`);
        }
      }
    }
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(`[middleware] Error in ensureVariantPriceSet: ${msg}`);
  }

  next();
}

export const config = {
  routes: {
    "/admin/products*": {
      method: ["GET"],
      middlewares: [ensureVariantPriceSet],
    },
  },
};
