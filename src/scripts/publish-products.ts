import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function publishProducts({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    logger.info("Starting product publishing...")

    // Get all products
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "sales_channels.id"],
    })

    // Get all sales channels
    const { data: salesChannels } = await query.graph({
      entity: "sales_channel",
      fields: ["id", "name"],
    })

    if (!salesChannels || salesChannels.length === 0) {
      logger.error("No sales channels found!")
      return
    }

    const defaultSalesChannel = salesChannels[0]!
    logger.info(`Using sales channel: ${defaultSalesChannel.name} (${defaultSalesChannel.id})`)

    // Link module to manage relationships
    const linkModuleService = container.resolve(ContainerRegistrationKeys.LINK)

    for (const product of products) {
      const productSalesChannels = product.sales_channels || []
      
      if (productSalesChannels.length === 0) {
        logger.info(`Publishing product: ${product.title} (${product.id})`)
        
        // Create link between product and sales channel
        await linkModuleService.create({
          productService: {
            product_id: product.id,
          },
          salesChannelService: {
            sales_channel_id: defaultSalesChannel.id,
          },
        })
        
        logger.info(`✓ Published: ${product.title}`)
      } else {
        logger.info(`⊘ Already published: ${product.title}`)
      }
    }

    logger.info("✓ All products published successfully!")
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logger.error(`Error publishing products: ${errMsg}`)
    throw error
  }
}
