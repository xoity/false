import { MedusaService } from "@medusajs/framework/utils"
import Banner from "./models/banner"

class BannerModuleService extends MedusaService({
  Banner,
}) {
  async getLatestBanner() {
    try {
      // Use listBanners method provided by MedusaService
      const banners = await this.listBanners!(
        {},
        {
          take: 1,
          order: { created_at: "DESC" },
        }
      )

      return banners[0] || null
    } catch (error) {
      console.error("Error getting latest banner:", error)
      return null
    }
  }

  async upsertBannerSettings(data: {
    text: string
    enabled?: boolean
    background_color?: string
    text_color?: string
  }) {
    try {
      const latest = await this.getLatestBanner()

      if (latest) {
        // Update existing banner
        const [updated] = await this.updateBanners!([
          {
            id: latest.id,
            ...data,
          },
        ])
        return updated
      }

      // Create new banner
      const [created] = await this.createBanners!([data])
      return created
    } catch (error) {
      console.error("Error upserting banner settings:", error)
      throw error
    }
  }
}

export default BannerModuleService
