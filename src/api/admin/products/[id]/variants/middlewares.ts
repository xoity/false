import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ensureVariantPriceSetWorkflow } from "../../../../../workflows/ensure-variant-price-sets";

/**
 * Middleware that runs after variant creation/update to ensure price sets exist.
 * This intercepts all variant-related requests under /admin/products/:id/variants
 */
export async function autoCreateVariantPriceSet(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  // Store original methods
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  // Intercept response to get variant IDs after creation
  const interceptResponse = async (data: any) => {
    if (!data || typeof data !== "object") {
      return data;
    }

    try {
      const logger = req.scope.resolve("logger");

      // Handle both single variant and array responses
      const variants = data.variant ? [data.variant] : data.variants || [];

      for (const variant of variants) {
        if (variant?.id) {
          logger.info(`[auto-price] Processing variant ${variant.id}`);

          // Run workflow to ensure price set exists
          await ensureVariantPriceSetWorkflow(req.scope).run({
            input: { variantId: variant.id },
          });
        }
      }
    } catch (error) {
      const logger = req.scope.resolve("logger");
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`[auto-price] Failed to auto-create price set: ${msg}`);
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
      bodyParser: { sizeLimit: "10mb" },
      middlewares: [autoCreateVariantPriceSet],
    },
  },
};
