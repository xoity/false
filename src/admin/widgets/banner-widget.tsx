import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Input, Label, Switch, Button, Text, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"

const BannerWidget = () => {
  const [text, setText] = useState("")
  const [enabled, setEnabled] = useState(true)
  const [backgroundColor, setBackgroundColor] = useState("#000000")
  const [textColor, setTextColor] = useState("#FFFFFF")
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  useEffect(() => {
    loadBannerSettings()
  }, [])

  const loadBannerSettings = async () => {
    try {
      const response = await fetch("/admin/banner", {
        credentials: "include",
      })
      
      if (response.ok) {
        const data = await response.json()
        setText(data.text || "")
        setEnabled(data.enabled !== false)
        setBackgroundColor(data.backgroundColor || "#000000")
        setTextColor(data.textColor || "#FFFFFF")
      }
    } catch (error) {
      console.error("Failed to load banner settings:", error)
    } finally {
      setInitialLoad(false)
    }
  }

  const handleSave = async () => {
    if (!text.trim()) {
      toast.error("Error", {
        description: "Banner text is required",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/admin/banner", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          enabled,
          backgroundColor,
          textColor,
        }),
      })

      if (response.ok) {
        toast.success("Success", {
          description: "Banner settings updated successfully!",
        })
      } else {
        const error = await response.json()
        toast.error("Error", {
          description: error.message || "Failed to update banner settings",
        })
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to update banner settings",
      })
    } finally {
      setLoading(false)
    }
  }

  if (initialLoad) {
    return (
      <Container className="p-6">
        <Text className="text-gray-500">Loading...</Text>
      </Container>
    )
  }

  return (
    <Container className="p-6 space-y-6">
      <div>
        <Heading level="h2">Banner Settings</Heading>
        <Text className="text-gray-600 mt-1">
          Configure the banner that appears at the top of your store
        </Text>
      </div>

      {/* Preview */}
      {text && enabled && (
        <div className="rounded-lg overflow-hidden border border-gray-200">
          <div
            className="py-3 px-4 text-center text-sm uppercase tracking-wider font-light"
            style={{
              backgroundColor: backgroundColor,
              color: textColor,
            }}
          >
            {text}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="enabled">Enable Banner</Label>
          <Switch
            id="enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="text">Banner Text</Label>
          <Input
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="FREE SHIPPING ON ORDERS OVER $100 • LIMITED TIME OFFER"
            maxLength={500}
          />
          <Text className="text-xs text-gray-500">
            {text.length}/500 characters
          </Text>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="backgroundColor">Background Color</Label>
            <div className="flex items-center gap-2">
              <input
                id="backgroundColor"
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="textColor">Text Color</Label>
            <div className="flex items-center gap-2">
              <input
                id="textColor"
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
              />
              <Input
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                placeholder="#FFFFFF"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Saving..." : "Save Banner Settings"}
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default BannerWidget
