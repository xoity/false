import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function fixInventorySetup({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const linkModuleService = container.resolve(ContainerRegistrationKeys.LINK)
  
  // Resolve modules
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const inventoryModule = container.resolve(Modules.INVENTORY)

  try {
    logger.info("=== Starting Inventory & Stock Location Setup ===")

    // Step 1: Get or create default stock location
    let stockLocations = await stockLocationModule.listStockLocations({})
    let stockLocation

    if (stockLocations.length === 0) {
      logger.info("Creating default stock location...")
      stockLocation = await stockLocationModule.createStockLocations({
        name: "Main Warehouse",
      })
      logger.info(`✓ Created stock location: ${stockLocation.id}`)
    } else {
      stockLocation = stockLocations[0]!
      logger.info(`Using existing stock location: ${stockLocation.name} (${stockLocation.id})`)
    }

    // Step 2: Get sales channel
    const salesChannels = await salesChannelModule.listSalesChannels({})
    if (salesChannels.length === 0) {
      logger.error("No sales channels found!")
      return
    }
    const salesChannel = salesChannels[0]!
    logger.info(`Using sales channel: ${salesChannel.name} (${salesChannel.id})`)

    // Step 3: Link sales channel to stock location
    try {
      await linkModuleService.create({
        [Modules.SALES_CHANNEL]: {
          sales_channel_id: salesChannel.id,
        },
        [Modules.STOCK_LOCATION]: {
          stock_location_id: stockLocation.id,
        },
      })
      logger.info(`✓ Linked sales channel to stock location`)
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes("already exists")) {
        logger.info(`⊘ Sales channel already linked to stock location`)
      } else {
        throw error
      }
    }

    // Step 4: Get all product variants
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "variants.*"],
    })

    logger.info(`Found ${products.length} products`)

    // Step 5: Create inventory items for each variant
    for (const product of products) {
      logger.info(`\nProcessing product: ${product.title}`)
      
      for (const variant of product.variants || []) {
        try {
          // Check if inventory item already exists for this variant
          const existingInventory = await inventoryModule.listInventoryItems({
            sku: variant.sku || `${product.title}-${variant.title}`,
          })

          let inventoryItem

          if (existingInventory.length === 0) {
            // Create inventory item
            inventoryItem = await inventoryModule.createInventoryItems({
              sku: variant.sku || `${product.title}-${variant.title}`,
            })
            logger.info(`  ✓ Created inventory item for variant: ${variant.title}`)
          } else {
            inventoryItem = existingInventory[0]!
            logger.info(`  ⊘ Inventory item already exists for: ${variant.title}`)
          }

          // Link inventory item to variant
          try {
            await linkModuleService.create({
              [Modules.PRODUCT]: {
                variant_id: variant.id,
              },
              [Modules.INVENTORY]: {
                inventory_item_id: inventoryItem.id,
              },
            })
            logger.info(`  ✓ Linked inventory to variant: ${variant.title}`)
          } catch (error: unknown) {
            if (error instanceof Error && error.message?.includes("already exists")) {
              logger.info(`  ⊘ Variant already linked to inventory`)
            } else {
              throw error
            }
          }

          // Create inventory level (stock at location)
          try {
            await inventoryModule.createInventoryLevels({
              inventory_item_id: inventoryItem.id,
              location_id: stockLocation.id,
              stocked_quantity: 100, // Default quantity
            })
            logger.info(`  ✓ Set stock quantity to 100 for: ${variant.title}`)
          } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error)
            if (errMsg.includes("already exists") || errMsg.includes("duplicate")) {
              logger.info(`  ⊘ Stock level already exists for: ${variant.title}`)
            } else {
              logger.warn(`  ⚠ Could not set stock level: ${errMsg}`)
            }
          }
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : String(error)
          logger.error(`  ✗ Error processing variant ${variant.title}: ${errMsg}`)
        }
      }
    }

    logger.info("\n=== ✓ Inventory setup complete! ===")
    logger.info("All products should now be available for purchase.")
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    logger.error(`Fatal error: ${errMsg}`)
    if (stack) logger.error(stack)
    throw error
  }
}
