import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BRANDS } from "../../../types";

// GET /store/brands - List all available brands for storefront
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandsArray = Object.values(BRANDS).map((brand) => ({
      ...brand,
      categories: getBrandCategories(brand.id),
    }));

    res.json({
      brands: brandsArray,
      count: brandsArray.length,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to fetch brands",
    });
  }
}

// GET /store/brands/:slug - Get a specific brand by slug
export async function GET_BY_SLUG(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { slug } = req.params;

    const brand = Object.values(BRANDS).find((b) => b.slug === slug);

    if (!brand) {
      return res.status(404).json({
        error: `Brand with slug '${slug}' not found`,
      });
    }

    return res.json({
      brand: {
        ...brand,
        categories: getBrandCategories(brand.id),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to fetch brand",
    });
  }
}

// Helper function to get categories for each brand
function getBrandCategories(brandId: string): string[] {
  const categories: Record<string, string[]> = {
    "1": ["Men's Shoes", "Women's Shoes", "Casual Footwear", "Formal Footwear", "Athletic Shoes"],
    "2": ["Casual Abayas", "Formal Abayas", "Embroidered Abayas", "Daily Wear"],
    "3": ["Men's Shoes", "Women's Shoes", "Accessories", "Bags", "Fashion Items"],
    "4": ["Clothing", "Bags", "Accessories", "Fashion Collections", "Trendy Wear"],
    "5": ["Kids Clothing", "Kids Shoes", "Kids Accessories", "Boys Fashion", "Girls Fashion"],
    "6": ["Chic Clothing", "Trendy Bags", "Everyday Accessories", "Modern Fashion", "Elegant Wear"],
  };

  return categories[brandId] || [];
}
