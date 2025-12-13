import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { BANNER_MODULE } from "../../../modules/banner"
import type BannerModuleService from "../../../modules/banner/service"

export interface BannerSettings {
  text: string;
  enabled: boolean;
  backgroundColor?: string;
  textColor?: string;
}

const DEFAULT_BANNER: Required<BannerSettings> = {
  text: "FREE SHIPPING ON ORDERS OVER $100 • LIMITED TIME OFFER",
  enabled: true,
  backgroundColor: "#000000",
  textColor: "#FFFFFF",
}

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
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

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    const { text, enabled, backgroundColor, textColor } =
      (req.body as Partial<BannerSettings>) ?? {}

    if (typeof text !== "string" || !text.trim() || text.length > 500) {
      return res.status(400).json({ message: "Invalid banner text" })
    }

    if (enabled !== undefined && typeof enabled !== "boolean") {
      return res.status(400).json({ message: "Invalid enabled value" })
    }

    if (backgroundColor !== undefined && typeof backgroundColor !== "string") {
      return res.status(400).json({ message: "Invalid backgroundColor" })
    }

    if (textColor !== undefined && typeof textColor !== "string") {
      return res.status(400).json({ message: "Invalid textColor" })
    }

    const service = req.scope.resolve<BannerModuleService>(BANNER_MODULE)
    const banner = await service.upsertBannerSettings({
      text: text.trim(),
      enabled,
      background_color: backgroundColor,
      text_color: textColor,
    })
    
    return res.json({
      message: "Banner settings updated successfully",
      settings: {
        text: banner?.text ?? text.trim(),
        enabled: banner?.enabled ?? (enabled ?? true),
        backgroundColor:
          banner?.background_color ??
          backgroundColor ??
          DEFAULT_BANNER.backgroundColor,
        textColor:
          banner?.text_color ?? textColor ?? DEFAULT_BANNER.textColor,
      },
    })
  } catch (error) {
    res.status(500).json({ message: "Failed to update banner settings" })
  }
}
