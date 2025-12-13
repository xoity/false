import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function patchBrandMetadata({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModuleService = container.resolve(Modules.PRODUCT);

  logger.info("Patching product metadata -> distributing products across brands...");

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "metadata"],
  });

  logger.info(`Found ${products.length} products to update`);

  // Map products to brands based on their handle/type
  const brandMapping: Record<string, string> = {
    'sweatpants': '4',  // Modern Attire
    'shorts': '4',      // Modern Attire
    'sweatshirt': '4',  // Modern Attire
    't-shirt': '4',     // Modern Attire
  };

  for (const p of products) {
    try {
      const brandId = brandMapping[p.handle] || '4'; // Default to Modern Attire
      await productModuleService.updateProducts(p.id, {
        metadata: {
          ...(p.metadata || {}),
          brandId: brandId, // Always store as string
        },
      });
      logger.info(`Updated product ${p.id} (${p.handle}) -> brandId: "${brandId}"`);
    } catch (err) {
      logger.error(`Failed to update product ${p.id}: ${err}`);
    }
  }

  logger.info("Done patching product metadata.");
}
