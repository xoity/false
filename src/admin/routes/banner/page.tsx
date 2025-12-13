import { useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"

type BannerPayload = {
  text: string
  enabled: boolean
  backgroundColor?: string
  textColor?: string
}

const BannerPage = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [text, setText] = useState("")
  const [enabled, setEnabled] = useState(true)
  const [backgroundColor, setBackgroundColor] = useState("#000000")
  const [textColor, setTextColor] = useState("#FFFFFF")

  const load = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/admin/banner")
      const data = (await res.json()) as BannerPayload

      setText(data.text ?? "")
      setEnabled(data.enabled !== false)
      setBackgroundColor(data.backgroundColor ?? "#000000")
      setTextColor(data.textColor ?? "#FFFFFF")
    } catch (e: any) {
      setError(e?.message ?? "Failed to load banner")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/admin/banner", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text,
          enabled,
          backgroundColor,
          textColor,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.message ?? "Failed to save banner")
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to save banner")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Banner</h1>

      {error && (
        <div style={{ marginBottom: 12, color: "#b91c1c" }}>{error}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Text</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            style={{ padding: 10, border: "1px solid #ddd" }}
          />
          <small>{text.length}/500</small>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>Enabled</span>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Background Color</span>
          <input
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            style={{ padding: 10, border: "1px solid #ddd" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Text Color</span>
          <input
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            style={{ padding: 10, border: "1px solid #ddd" }}
          />
        </label>

        <div
          style={{
            padding: 12,
            background: backgroundColor,
            color: textColor,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {enabled ? text : "(Banner disabled)"}
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          style={{
            padding: "10px 14px",
            background: "#111827",
            color: "#fff",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Banner",
})

export default BannerPage
