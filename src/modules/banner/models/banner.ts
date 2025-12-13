import { model } from "@medusajs/framework/utils"

const Banner = model.define("banner", {
  id: model.id().primaryKey(),
  text: model.text(),
  enabled: model.boolean().default(true),
  background_color: model.text().nullable(),
  text_color: model.text().nullable(),
})

export default Banner
