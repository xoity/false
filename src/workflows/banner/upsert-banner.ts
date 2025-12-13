import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { BANNER_MODULE } from "../../modules/banner"
import type BannerModuleService from "../../modules/banner/service"

export type UpsertBannerInput = {
  text: string
  enabled?: boolean
  background_color?: string | null
  text_color?: string | null
}

const upsertBannerStep = createStep(
  "banner-upsert",
  async (input: UpsertBannerInput, { container }) => {
    const service = container.resolve<BannerModuleService>(BANNER_MODULE)
    const banner = await service.upsertBannerSettings(input)
    return new StepResponse(banner)
  }
)

const upsertBannerWorkflow = createWorkflow(
  "banner-upsert-workflow",
  (input: UpsertBannerInput) => {
    const banner = upsertBannerStep(input)
    return new WorkflowResponse({ banner })
  }
)

export default upsertBannerWorkflow
