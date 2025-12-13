import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function addProductPrices({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pricingModule = container.resolve(Modules.PRICING)

  try {
    logger.info("=== Adding Prices to Products ===")

    // Get all products without prices
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "variants.id", "variants.title"],
    })

    // Get regions to use their currency
    const { data: regions } = await query.graph({
      entity: "region",
      fields: ["id", "name", "currency_code"],
    })

    if (regions.length === 0) {
      logger.error("No regions found!")
      return
    }

    const region = regions[0]
    logger.info(`Using region: ${region.name} (Currency: ${region.currency_code})`)

    for (const product of products) {
      logger.info(`\nProcessing: ${product.title}`)
      
      for (const variant of product.variants || []) {
        try {
          // Create price set for variant
          const priceSet = await pricingModule.createPriceSets({
            prices: [
              {
                amount: 10000, // AED 100.00 (in cents)
                currency_code: region.currency_code,
                rules: {},
              },
            ],
          })

          logger.info(`  ✓ Created price set for: ${variant.title}`)

          // Link price set to variant
          const linkModuleService = container.resolve(ContainerRegistrationKeys.LINK)
          await linkModuleService.create({
            [Modules.PRODUCT]: {
              variant_id: variant.id,
            },
            [Modules.PRICING]: {
              price_set_id: priceSet.id,
            },
          })

          logger.info(`  ✓ Linked price (AED 100.00) to variant: ${variant.title}`)
        } catch (error) {
          if (error.message?.includes("already exists")) {
            logger.info(`  ⊘ Price already exists for: ${variant.title}`)
          } else {
            logger.warn(`  ⚠ Could not add price: ${error.message}`)
          }
        }
      }
    }

    logger.info("\n=== ✓ Prices added successfully! ===")
  } catch (error) {
    logger.error(`Error: ${error.message}`)
    logger.error(error.stack)
    throw error
  }
}
