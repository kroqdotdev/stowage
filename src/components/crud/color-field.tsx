"use client"

import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export const PRESET_COLORS = [
  "#2563EB",
  "#0EA5E9",
  "#0891B2",
  "#059669",
  "#65A30D",
  "#CA8A04",
  "#EA580C",
  "#DC2626",
  "#E11D48",
  "#9333EA",
  "#4F46E5",
  "#475569",
] as const

function normalizeClientHex(value: string) {
  const trimmed = value.trim()
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`
  if (/^#([0-9a-fA-F]{3})$/.test(prefixed)) {
    const [, short] = /^#([0-9a-fA-F]{3})$/.exec(prefixed) ?? []
    if (short) {
      return (`#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`).toUpperCase()
    }
  }
  if (/^#([0-9a-fA-F]{6})$/.test(prefixed)) {
    return prefixed.toUpperCase()
  }
  return prefixed.toUpperCase()
}

export function ColorField({
  value,
  onChange,
  label = "Color",
  id,
}: {
  value: string
  onChange: (value: string) => void
  label?: string
  id: string
}) {
  const normalized = normalizeClientHex(value)

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>

      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-md border border-border shadow-xs"
          style={{ backgroundColor: /^#[0-9A-F]{6}$/.test(normalized) ? normalized : undefined }}
          aria-hidden="true"
        />
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#2563EB"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-wrap gap-2" role="list" aria-label="Preset colors">
        {PRESET_COLORS.map((swatch) => {
          const selected = normalized === swatch
          return (
            <button
              key={swatch}
              type="button"
              role="listitem"
              className={cn(
                "relative h-8 w-8 rounded-md border border-border shadow-xs transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                selected && "ring-2 ring-ring/70",
              )}
              style={{ backgroundColor: swatch }}
              onClick={() => onChange(swatch)}
              aria-label={`Select ${swatch}`}
              title={swatch}
            >
              {selected ? <Check className="mx-auto h-4 w-4 text-white drop-shadow" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
