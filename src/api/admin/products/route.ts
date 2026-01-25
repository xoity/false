import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

// GET /admin/products - List products with brand filtering
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT);
    const { brandId, limit = 50, offset = 0 } = req.query;

    const filters: any = {};

    // Build query
    const queryConfig: any = {
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    };

    // Fetch products
    const products = await productModuleService.listProducts(filters, queryConfig);

    // Filter by brand if specified (since metadata filtering might not work directly)
    let filteredProducts = products;
    if (brandId) {
      filteredProducts = products.filter(
        (p: any) => p.metadata?.brandId === brandId || p.metadata?.brandId === String(brandId)
      );
    }

    res.json({
      products: filteredProducts,
      count: filteredProducts.length,
      offset: parseInt(offset as string),
      limit: parseInt(limit as string),
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to fetch products",
    });
  }
}

// POST /admin/products - Create a new product with brand
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT);
    const body = req.body as Record<string, any>;
    const {
      title,
      description,
      handle,
      brandId, // This is the key field for brand association
      variants,
      options,
      images,
      ...rest
    } = body;

    // Validate brandId
    const validBrandIds = ["1", "2", "3", "4", "5", "6"];
    if (brandId && !validBrandIds.includes(String(brandId))) {
      return res.status(400).json({
        error: `Invalid brandId. Must be one of: ${validBrandIds.join(", ")}`,
        brands: {
          "1": "Crossbow - Quality footwear",
          "2": "Vigo Boutique - Abayas",
          "3": "Vigo Shoes - All sorts of shoes and items",
          "4": "Stepsstar - Fashion constellation",
          "5": "Stepsstar Kids - Kids fashion",
          "6": "Louis Cardy - Modern style and elegance",
        },
      });
    }

    // Create product with brandId in metadata
    const productData: any = {
      title,
      description,
      handle: handle || title.toLowerCase().replace(/\s+/g, "-"),
      metadata: {
        brandId: String(brandId || "4"), // Default to Stepsstar if not specified
        ...(rest.metadata || {}),
      },
      ...rest,
    };

    // Add variants if provided
    if (variants && variants.length > 0) {
      productData.variants = variants;
    }

    // Add options if provided
    if (options && options.length > 0) {
      productData.options = options;
    }

    // Add images if provided
    if (images && images.length > 0) {
      productData.images = images;
    }

    const product = await productModuleService.createProducts(productData);

    return res.json({
      product,
      message: "Product created successfully with brandId",
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to create product",
    });
  }
}

// PATCH /admin/products/:id - Update product including brand
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Product ID is required" });
    }
    const body = req.body as Record<string, any>;
    const { brandId, ...updateData } = body;

    // Validate brandId if provided
    if (brandId) {
      const validBrandIds = ["1", "2", "3", "4", "5", "6"];
      if (!validBrandIds.includes(String(brandId))) {
        return res.status(400).json({
          error: `Invalid brandId. Must be one of: ${validBrandIds.join(", ")}`,
        });
      }
    }

    // Get existing product to preserve metadata
    const existingProduct = await productModuleService.retrieveProduct(id, {
      select: ["id", "metadata"],
    });

    // Update product with new brandId in metadata
    const updatedProduct = await productModuleService.updateProducts(id, {
      ...updateData,
      metadata: {
        ...(existingProduct.metadata || {}),
        ...(updateData.metadata || {}),
        ...(brandId ? { brandId: String(brandId) } : {}),
      },
    });

    return res.json({
      product: updatedProduct,
      message: "Product updated successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to update product",
    });
  }
}
