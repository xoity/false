import { MedusaService } from "@medusajs/framework/utils"

import Banner from "./models/banner"

class BannerModuleService extends MedusaService({
  Banner,
}) {
  async getLatestBanner() {
    const banners = await this.listBanners(
      {},
      {
        order: { created_at: "DESC" },
        take: 1,
      }
    )

    return banners[0] ?? null
  }

  async upsertBannerSettings(input: {
    text: string
    enabled?: boolean
    background_color?: string | null
    text_color?: string | null
  }) {
    const current = await this.getLatestBanner()

    if (current) {
      const updated = await this.updateBanners({
        selector: { id: current.id },
        data: {
          text: input.text,
          enabled: input.enabled ?? current.enabled,
          background_color:
            input.background_color === undefined
              ? current.background_color
              : input.background_color,
          text_color:
            input.text_color === undefined
              ? current.text_color
              : input.text_color,
        },
      })

      return updated[0] ?? null
    }

    const created = await this.createBanners({
      text: input.text,
      enabled: input.enabled ?? true,
      background_color: input.background_color ?? null,
      text_color: input.text_color ?? null,
    })

    return created
  }
}

export default BannerModuleService
