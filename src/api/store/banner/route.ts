import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { BANNER_MODULE } from "../../../modules/banner"
import type BannerModuleService from "../../../modules/banner/service"

const DEFAULT_BANNER = {
  text: "FREE SHIPPING ON ORDERS OVER $100 • LIMITED TIME OFFER",
  enabled: true,
  backgroundColor: "#000000",
  textColor: "#FFFFFF",
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve<BannerModuleService>(BANNER_MODULE)

  const banner = await service.getLatestBanner()

  if (!banner) {
    return res.json(DEFAULT_BANNER)
  }

  return res.json({
    text: banner.text,
    enabled: banner.enabled,
    backgroundColor: banner.background_color ?? DEFAULT_BANNER.backgroundColor,
    textColor: banner.text_color ?? DEFAULT_BANNER.textColor,
  })
}
