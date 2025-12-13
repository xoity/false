import { MedusaService } from "@medusajs/framework/utils"
import Banner from "./models/banner"

class BannerModuleService extends MedusaService({
  Banner,
}) {
  async getLatestBanner() {
    const banners = await this.listBanners(
      {},
      {
        take: 1,
        order: {
          created_at: "DESC",
        },
      }
    )

    return banners[0] || null
  }

  async upsertBannerSettings(data: {
    text: string
    enabled?: boolean
    background_color?: string
    text_color?: string
  }) {
    const latest = await this.getLatestBanner()

    if (latest) {
      const [updated] = await this.updateBanners([
        {
          id: latest.id,
          ...data,
        },
      ])
      return updated
    }

    const [created] = await this.createBanners([data])
    return created
  }
}

export default BannerModuleService
