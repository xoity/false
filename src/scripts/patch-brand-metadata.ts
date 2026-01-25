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
  // Brand IDs:
  // 1 - Crossbow (quality footwear)
  // 2 - Vigo Boutique (abayas)
  // 3 - Vigo Shoes (all sorts of shoes and items)
  // 4 - Stepsstar (fashion constellation)
  // 5 - Stepsstar Kids (kids fashion)
  // 6 - Louis Cardy (modern style and elegance)
  const brandMapping: Record<string, string> = {
    // Footwear items -> Crossbow
    shoes: "1",
    boots: "1",
    sneakers: "1",
    sandals: "1",

    // Abayas -> Vigo Boutique
    abaya: "2",
    hijab: "2",
    "modest-wear": "2",

    // Mixed shoes/items -> Vigo Shoes
    "casual-shoes": "3",
    "fashion-shoes": "3",

    // Fashion items -> Stepsstar
    sweatpants: "4",
    shorts: "4",
    sweatshirt: "4",
    "t-shirt": "4",
    clothing: "4",
    bags: "4",
    accessories: "4",

    // Kids items -> Stepsstar Kids
    "kids-clothing": "5",
    "kids-shoes": "5",
    "boys-wear": "5",
    "girls-wear": "5",

    // Elegant items -> Louis Cardy
    "elegant-wear": "6",
    "chic-clothing": "6",
    "trendy-bags": "6",
  };

  for (const p of products) {
    try {
      const brandId = brandMapping[p.handle] || "4"; // Default to Stepsstar
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
