import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { defineMiddlewares } from "@medusajs/medusa";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import path from "path";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";

// Custom static file serving middleware for uploads (avoids adding express types)
const uploadsPath = path.join(process.cwd(), "uploads");

async function serveUploads(req: any, res: any, next: any) {
  try {
    const originalPath = (req.path || req.url || "") as string;
    const match = originalPath.match(/^\/uploads\/(.*)/);
    const filePath = match && match[1] ? decodeURIComponent(match[1]) : null;

    if (!filePath) {
      return next();
    }

    const absolutePath = path.join(uploadsPath, filePath);

    // Security: ensure requested file is inside uploads directory
    if (!absolutePath.startsWith(uploadsPath)) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Access denied" }));
      return;
    }

    if (!existsSync(absolutePath)) {
      return next();
    }

    const fileStats = await stat(absolutePath);
    if (!fileStats.isFile()) {
      return next();
    }

    const ext = filePath.split(".").pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      json: "application/json",
    };

    const contentType = contentTypeMap[ext || ""] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", fileStats.size);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.setHeader("ETag", `"${fileStats.mtime.getTime()}-${fileStats.size}"`);

    const stream = createReadStream(absolutePath);
    stream.pipe(res);
    stream.on("error", (err) => {
      console.error("stream error", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
      }
      res.end(JSON.stringify({ message: "Error streaming file" }));
    });
  } catch (err) {
    console.error("serveUploads error", err);
    return next();
  }
}

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

export default defineMiddlewares({
  routes: [
    {
      matcher: "/uploads/*",
      method: "GET",
      middlewares: [serveUploads],
    },
    {
      matcher: "/admin/products*",
      method: "GET",
      middlewares: [ensureVariantPriceSet],
    },
  ],
});
