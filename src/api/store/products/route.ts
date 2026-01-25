import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

// GET /store/products - List products with brand filtering for storefront
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT);
    const { brandId, limit = 50, offset = 0, q } = req.query;

    const filters: any = {};

    // Add search query if provided
    if (q) {
      filters.q = q;
    }

    // Build query config
    const queryConfig: any = {
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      relations: ["variants", "images", "options"],
    };

    // Fetch products
    const products = await productModuleService.listProducts(filters, queryConfig);

    // Filter by brand if specified
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
