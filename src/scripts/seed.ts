import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  const countries = ["gb", "de", "dk", "se", "fr", "es", "it"];

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: "eur",
          is_default: true,
        },
        {
          currency_code: "usd",
        },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  logger.info("Seeding region data...");
  let region: any;

  // Try to find existing region first to make seeding idempotent
  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "countries", "currency_code"],
  });
  const foundExisting = (existingRegions || []).find((r: any) =>
    (r.countries || []).some((c: string) => countries.includes(String(c).toLowerCase()))
  );

  if (foundExisting) {
    region = foundExisting;
    logger.info(`Found existing region to reuse: ${region.name} (${region.id})`);
  } else {
    try {
      const { result: regionResult } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "Europe",
              currency_code: "eur",
              countries,
              payment_providers: ["pp_system_default"],
            },
          ],
        },
      });
      region = regionResult[0];
      logger.info("Finished seeding regions.");
    } catch (err: any) {
      logger.warn(
        `Seeding regions failed: ${err?.message ?? String(err)} — attempting to find any region to reuse.`
      );
      // Fallback: reuse any existing region if present
      const { data: anyRegions } = await query.graph({
        entity: "region",
        fields: ["id", "name", "countries", "currency_code"],
      });
      if ((anyRegions || []).length) {
        region = anyRegions[0];
        logger.info(`Reusing fallback existing region: ${region.name} (${region.id})`);
      } else {
        throw err;
      }
    }
  }

  logger.info("Seeding tax regions...");
  // Create tax regions only for countries that don't already have a tax region
  const { data: existingTaxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["country_code"],
  });
  const existingCountryCodes = (existingTaxRegions || []).map((t: any) =>
    String(t.country_code).toLowerCase()
  );
  const missingCountries = countries.filter(
    (c) => !existingCountryCodes.includes(String(c).toLowerCase())
  );
  if (missingCountries.length) {
    await createTaxRegionsWorkflow(container).run({
      input: missingCountries.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    });
    logger.info("Finished seeding tax regions for missing countries.");
  } else {
    logger.info("All tax regions already exist. Skipping creation.");
  }

  logger.info("Seeding stock location data...");
  
  // Check for existing stock location to make it idempotent
  const { data: existingStockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });
  
  let stockLocation: any;
  const existingWarehouse = (existingStockLocations || []).find(
    (loc: any) => String(loc.name).toLowerCase() === "european warehouse"
  );

  if (existingWarehouse) {
    stockLocation = existingWarehouse;
    logger.info(`Reusing existing stock location: ${stockLocation.name} (${stockLocation.id})`);
  } else {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container
    ).run({
      input: {
        locations: [
          {
            name: "European Warehouse",
            address: {
              city: "Copenhagen",
              country_code: "DK",
              address_1: "",
            },
          },
        ],
      },
    });
    stockLocation = stockLocationResult[0];
    logger.info("Created new stock location.");
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (msg.includes("Cannot create multiple links") || msg.includes("already exists")) {
      logger.warn(`Link between stock_location and fulfillment already exists. Skipping.`);
    } else {
      throw err;
    }
  }
  

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Default Shipping Profile",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  let fulfillmentSet: any;
  try {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "European Warehouse delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Europe",
          geo_zones: [
            {
              country_code: "gb",
              type: "country",
            },
            {
              country_code: "de",
              type: "country",
            },
            {
              country_code: "dk",
              type: "country",
            },
            {
              country_code: "se",
              type: "country",
            },
            {
              country_code: "fr",
              type: "country",
            },
            {
              country_code: "es",
              type: "country",
            },
            {
              country_code: "it",
              type: "country",
            },
          ],
        },
      ],
    });
  } catch (err: any) {
    logger.warn(
      `Creating fulfillment set failed: ${err?.message ?? String(err)} — attempting to find existing fulfillment set.`
    );
    const { data: existingFulfillmentSets } = await query.graph({
      entity: "fulfillment_set",
      fields: ["id", "name", "service_zones"],
      filter: { name: "European Warehouse delivery" },
    });
    if ((existingFulfillmentSets || []).length) {
      fulfillmentSet = existingFulfillmentSets[0];
      logger.info(`Reusing existing fulfillment set: ${fulfillmentSet.name} (${fulfillmentSet.id})`);
    } else {
      throw err;
    }
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (msg.includes("Cannot create multiple links") || msg.includes("already exists")) {
      logger.warn(`Link between stock_location and fulfillment (set) already exists. Skipping.`);
    } else {
      throw err;
    }
  }

  // Resolve a service zone id for the fulfillment set (make robust when reusing existing set)
  let serviceZoneId: string | undefined = undefined;
  if (fulfillmentSet && fulfillmentSet.service_zones && fulfillmentSet.service_zones.length) {
    serviceZoneId = fulfillmentSet.service_zones[0].id;
  } else {
    const { data: svcZones } = await query.graph({
      entity: "service_zone",
      fields: ["id"],
      limit: 1,
    });
    serviceZoneId = svcZones && svcZones.length ? svcZones[0].id : undefined;
  }

  // Check for existing shipping options
  const { data: existingShippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
  });
  const existingShippingNames = new Set(
    (existingShippingOptions || []).map((opt: any) => String(opt.name).toLowerCase())
  );

  const shippingOptionsToCreate = [];
  
  if (!existingShippingNames.has("standard shipping")) {
    shippingOptionsToCreate.push({
      name: "Standard Shipping",
      price_type: "flat",
      provider_id: "manual_manual",
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: "Standard",
        description: "Ship in 2-3 days.",
        code: "standard",
      },
      prices: [
        {
          currency_code: "usd",
          amount: 10,
        },
        {
          currency_code: "eur",
          amount: 10,
        },
        {
          region_id: region.id,
          amount: 10,
        },
      ],
      rules: [
        {
          attribute: "enabled_in_store",
          value: "true",
          operator: "eq",
        },
        {
          attribute: "is_return",
          value: "false",
          operator: "eq",
        },
      ],
    });
  }

  if (!existingShippingNames.has("express shipping")) {
    shippingOptionsToCreate.push({
      name: "Express Shipping",
      price_type: "flat",
      provider_id: "manual_manual",
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: "Express",
        description: "Ship in 24 hours.",
        code: "express",
      },
      prices: [
        {
          currency_code: "usd",
          amount: 10,
        },
        {
          currency_code: "eur",
          amount: 10,
        },
        {
          region_id: region.id,
          amount: 10,
        },
      ],
      rules: [
        {
          attribute: "enabled_in_store",
          value: "true",
          operator: "eq",
        },
        {
          attribute: "is_return",
          value: "false",
          operator: "eq",
        },
      ],
    });
  }

  if (shippingOptionsToCreate.length) {
    await createShippingOptionsWorkflow(container).run({
      input: shippingOptionsToCreate,
    });
    logger.info(`Created ${shippingOptionsToCreate.length} shipping options.`);
  } else {
    logger.info("All shipping options already exist. Skipping.");
  }
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");

  // Check for existing publishable API key
  const { data: existingApiKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "type"],
  });

  let publishableApiKey: any;
  const existingKey = (existingApiKeys || []).find(
    (key: any) =>
      String(key.title).toLowerCase() === "webshop" && key.type === "publishable"
  );

  if (existingKey) {
    publishableApiKey = existingKey;
    logger.info(`Reusing existing publishable API key: ${publishableApiKey.title}`);
  } else {
    const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
      container
    ).run({
      input: {
        api_keys: [
          {
            title: "Webshop",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });
    publishableApiKey = publishableApiKeyResult[0];
    logger.info("Created new publishable API key.");
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding product data...");

  // Ensure product categories exist (idempotent)
  const desiredCategories = [
    { name: "Shirts", is_active: true },
    { name: "Sweatshirts", is_active: true },
    { name: "Pants", is_active: true },
    { name: "Merch", is_active: true },
  ];

  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
  });
  const existingNames = (existingCategories || []).map((c: any) =>
    String(c.name).toLowerCase()
  );

  const toCreate = desiredCategories.filter(
    (c) => !existingNames.includes(c.name.toLowerCase())
  );

  if (toCreate.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: toCreate,
      },
    });
  }

  // Refresh category list for later lookups
  const { data: categoryResult } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
  });

  // Check for existing products to make seeding idempotent
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  const existingHandles = new Set(
    (existingProducts || []).map((p: any) => String(p.handle).toLowerCase())
  );

  const desiredProducts = [
    {
      title: "Medusa T-Shirt",
      category_ids: [
        categoryResult.find((cat) => cat.name === "Shirts")!.id,
      ],
      description:
        "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
      handle: "t-shirt",
      weight: 400,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      images: [
        {
          url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
        },
        {
          url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png",
        },
        {
          url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png",
        },
        {
          url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png",
        },
      ],
      options: [
        {
          title: "Size",
          values: ["S", "M", "L", "XL"],
        },
        {
          title: "Color",
          values: ["Black", "White"],
        },
      ],
      variants: [
        {
          title: "S / Black",
          sku: "SHIRT-S-BLACK",
          options: {
            Size: "S",
            Color: "Black",
          },
          prices: [
            {
              amount: 10,
              currency_code: "eur",
            },
            {
              amount: 15,
              currency_code: "usd",
            },
          ],
        },
        {
          title: "S / White",
          sku: "SHIRT-S-WHITE",
          options: {
            Size: "S",
            Color: "White",
          },
          prices: [
            {
              amount: 10,
              currency_code: "eur",
            },
            {
              amount: 15,
              currency_code: "usd",
            },
          ],
        },
        {
          title: "M / Black",
          sku: "SHIRT-M-BLACK",
          options: {
            Size: "M",
            Color: "Black",
          },
          prices: [
            {
              amount: 10,
              currency_code: "eur",
            },
            {
              amount: 15,
              currency_code: "usd",
            },
          ],
        },
        {
          title: "M / White",
          sku: "SHIRT-M-WHITE",
          options: {
            Size: "M",
            Color: "White",
          },
          prices: [
            {
              amount: 10,
              currency_code: "eur",
            },
            {
              amount: 15,
              currency_code: "usd",
            },
          ],
        },
        {
          title: "L / Black",
          sku: "SHIRT-L-BLACK",
          options: {
            Size: "L",
            Color: "Black",
          },
          prices: [
            {
              amount: 10,
              currency_code: "eur",
            },
            {
              amount: 15,
              currency_code: "usd",
            },
          ],
        },
        {
          title: "L / White",
          sku: "SHIRT-L-WHITE",
          options: {
            Size: "L",
            Color: "White",
          },
          prices: [
            {
              amount: 10,
              currency_code: "eur",
            },
            {
              amount: 15,
              currency_code: "usd",
            },
          ],
        },
        {
          title: "XL / Black",
          sku: "SHIRT-XL-BLACK",
          options: {
            Size: "XL",
            Color: "Black",
          },
          prices: [
            {
              amount: 10,
              currency_code: "eur",
            },
            {
              amount: 15,
              currency_code: "usd",
            },
          ],
        },
        {
          title: "XL / White",
          sku: "SHIRT-XL-WHITE",
          options: {
            Size: "XL",
            Color: "White",
          },
          prices: [
            {
              amount: 10,
              currency_code: "eur",
            },
            {
              amount: 15,
              currency_code: "usd",
            },
          ],
        },
      ],
      sales_channels: [
        {
          id: defaultSalesChannel[0].id,
        },
      ],
        },
        {
          title: "Medusa Sweatshirt",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Sweatshirts")!.id,
          ],
          description:
            "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
          handle: "sweatshirt",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-back.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
          variants: [
            {
              title: "S",
              sku: "SWEATSHIRT-S",
              options: {
                Size: "S",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M",
              sku: "SWEATSHIRT-M",
              options: {
                Size: "M",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L",
              sku: "SWEATSHIRT-L",
              options: {
                Size: "L",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL",
              sku: "SWEATSHIRT-XL",
              options: {
                Size: "XL",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Medusa Sweatpants",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Pants")!.id,
          ],
          description:
            "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
          handle: "sweatpants",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-back.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
          variants: [
            {
              title: "S",
              sku: "SWEATPANTS-S",
              options: {
                Size: "S",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M",
              sku: "SWEATPANTS-M",
              options: {
                Size: "M",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L",
              sku: "SWEATPANTS-L",
              options: {
                Size: "L",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL",
              sku: "SWEATPANTS-XL",
              options: {
                Size: "XL",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Medusa Shorts",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Merch")!.id,
          ],
          description:
            "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
          handle: "shorts",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
          variants: [
            {
              title: "S",
              sku: "SHORTS-S",
              options: {
                Size: "S",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M",
              sku: "SHORTS-M",
              options: {
                Size: "M",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L",
              sku: "SHORTS-L",
              options: {
                Size: "L",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL",
              sku: "SHORTS-XL",
              options: {
                Size: "XL",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });

  // Filter to only create products that don't already exist
  const productsToCreate = desiredProducts.filter(
    (p) => !existingHandles.has(String(p.handle).toLowerCase())
  );

  if (productsToCreate.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: productsToCreate,
      },
    });
    logger.info(`Seeded ${productsToCreate.length} new products.`);
  } else {
    logger.info("All products already exist. Skipping product creation.");
  }

  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  // Check existing inventory levels to avoid duplicates
  const { data: existingInventoryLevels } = await query.graph({
    entity: "inventory_level",
    fields: ["inventory_item_id", "location_id"],
  });

  const existingLevelKeys = new Set(
    (existingInventoryLevels || []).map(
      (level: any) => `${level.inventory_item_id}:${level.location_id}`
    )
  );

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const key = `${inventoryItem.id}:${stockLocation.id}`;
    if (!existingLevelKeys.has(key)) {
      const inventoryLevel = {
        location_id: stockLocation.id,
        stocked_quantity: 1000000,
        inventory_item_id: inventoryItem.id,
      };
      inventoryLevels.push(inventoryLevel);
    }
  }

  if (inventoryLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: inventoryLevels,
      },
    });
    logger.info(`Seeded ${inventoryLevels.length} new inventory levels.`);
  } else {
    logger.info("All inventory levels already exist. Skipping.");
  }

  logger.info("Finished seeding inventory levels data.");
}
