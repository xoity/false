import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ensureVariantPriceSetWorkflow } from "../../../workflows/ensure-variant-price-sets";

/**
 * Middleware that runs after product creation to ensure all variants have price sets.
 * This intercepts POST requests to /admin/products
 */
export async function autoCreateProductVariantPriceSets(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  // Only process POST (create) and PUT (update) requests
  if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
    return next();
  }

  // Store original methods
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  // Intercept response to get product with variant IDs after creation
  const interceptResponse = async (data: any) => {
    if (!data || typeof data !== "object") {
      return data;
    }

    try {
      const logger = req.scope.resolve("logger");

      // Extract product from response
      const product = data.product || data;

      if (product?.variants && Array.isArray(product.variants)) {
        logger.info(
          `[auto-price] Processing ${product.variants.length} variants for product ${product.id}`
        );

        // Process all variants
        for (const variant of product.variants) {
          if (variant?.id) {
            try {
              await ensureVariantPriceSetWorkflow(req.scope).run({
                input: { variantId: variant.id },
              });
            } catch (error) {
              const msg = error instanceof Error ? error.message : String(error);
              logger.warn(`[auto-price] Failed for variant ${variant.id}: ${msg}`);
            }
          }
        }
      }
    } catch (error) {
      const logger = req.scope.resolve("logger");
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`[auto-price] Failed to auto-create price sets: ${msg}`);
    }

    return data;
  };

  // Override response methods
  res.json = async function (data: any) {
    const processedData = await interceptResponse(data);
    return originalJson(processedData);
  } as any;

  res.send = async function (data: any) {
    const processedData = await interceptResponse(data);
    return originalSend(processedData);
  } as any;

  next();
}

export const config = {
  routes: {
    "*": {
      method: ["POST", "PUT", "PATCH"],
      bodyParser: { sizeLimit: "10mb" },
      middlewares: [autoCreateProductVariantPriceSets],
    },
  },
};
