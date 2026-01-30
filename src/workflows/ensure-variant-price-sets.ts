import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";

type ProductVariantInput = {
  variantId: string;
};

/**
 * Step that ensures a product variant has a price set.
 * Creates an empty price set and links it to the variant if missing.
 */
const ensurePriceSetStep = createStep(
  "ensure-variant-price-set",
  async ({ variantId }: ProductVariantInput, { container }) => {
    const logger = container.resolve("logger");
    const query = container.resolve("query");
    const pricingModule = container.resolve(Modules.PRICING);
    const linkModule = container.resolve("link");

    try {
      // Check if variant already has prices
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "prices.id"],
        filters: { id: variantId },
      });

      if (!variants || variants.length === 0) {
        logger.warn(`[workflow] Variant ${variantId} not found`);
        return new StepResponse(null);
      }

      const variant = variants[0] as any;
      const hasPrices =
        variant.prices && Array.isArray(variant.prices) && variant.prices.length > 0;

      if (hasPrices) {
        logger.info(`[workflow] Variant ${variantId} already has prices, skipping`);
        return new StepResponse(null);
      }

      // Create empty price set
      const priceSet = await pricingModule.createPriceSets({
        prices: [],
      });

      // Link price set to variant
      await linkModule.create({
        [Modules.PRODUCT]: {
          variant_id: variantId,
        },
        [Modules.PRICING]: {
          price_set_id: priceSet.id,
        },
      });

      logger.info(`[workflow] ✓ Created price set ${priceSet.id} for variant ${variantId}`);

      return new StepResponse({ priceSetId: priceSet.id }, priceSet.id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes("already exists") && !msg.includes("duplicate")) {
        logger.error(`[workflow] Failed to create price set: ${msg}`);
      }
      return new StepResponse(null);
    }
  },
  async (priceSetId, { container }) => {
    // Compensation: Delete the price set if workflow fails
    if (!priceSetId) return;

    try {
      const pricingModule = container.resolve(Modules.PRICING);
      await pricingModule.deletePriceSets([priceSetId]);
    } catch (error) {
      // Ignore deletion errors
    }
  }
);

/**
 * Workflow that ensures a variant has a price set.
 * Can be called from API routes or subscribers.
 */
export const ensureVariantPriceSetWorkflow = createWorkflow(
  "ensure-variant-price-set",
  (input: ProductVariantInput) => {
    const result = ensurePriceSetStep(input);
    return new WorkflowResponse(result);
  }
);
