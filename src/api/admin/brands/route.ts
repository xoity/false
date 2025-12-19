import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BRANDS } from "../../../types";

// GET /admin/brands - List all available brands
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  try {
    const brandsArray = Object.values(BRANDS).map(brand => ({
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

// Helper function to get categories for each brand
function getBrandCategories(brandId: string): string[] {
  const categories: Record<string, string[]> = {
    '1': ['Men\'s Shoes', 'Women\'s Shoes', 'Casual Footwear', 'Formal Footwear', 'Athletic Shoes'],
    '2': ['Casual Abayas', 'Formal Abayas', 'Embroidered Abayas', 'Daily Wear'],
    '3': ['Men\'s Shoes', 'Women\'s Shoes', 'Accessories', 'Bags', 'Fashion Items'],
    '4': ['Clothing', 'Bags', 'Accessories', 'Fashion Collections', 'Trendy Wear'],
    '5': ['Kids Clothing', 'Kids Shoes', 'Kids Accessories', 'Boys Fashion', 'Girls Fashion'],
    '6': ['Chic Clothing', 'Trendy Bags', 'Everyday Accessories', 'Modern Fashion', 'Elegant Wear'],
  };
  
  return categories[brandId] || [];
}
