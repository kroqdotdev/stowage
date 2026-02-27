"use client"

import { useId, useState } from "react"
import { Input } from "@/components/ui/input"
import { FieldValue, type FieldDefinition } from "@/components/fields/types"
import { isIsoDateOnly } from "@/lib/date-format"

function coerceString(value: FieldValue) {
  if (value === null || value === undefined) {
    return ""
  }
  return String(value)
}

function coerceNumber(value: FieldValue) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }
  return ""
}

function coerceCheckbox(value: FieldValue) {
  return value === true
}

export function DynamicField({
  definition,
  value,
  onChange,
  disabled = false,
}: {
  definition: Pick<FieldDefinition, "name" | "fieldType" | "options" | "required">
  value: FieldValue
  onChange: (value: FieldValue) => void
  disabled?: boolean
}) {
  const fieldId = useId()
  const [urlError, setUrlError] = useState<string | null>(null)

  if (definition.fieldType === "checkbox") {
    const checked = coerceCheckbox(value)

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            id={fieldId}
            type="checkbox"
            className="h-4 w-4 rounded border border-input"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
          />
          <label htmlFor={fieldId} className="text-sm font-medium">
            {definition.name}
            {definition.required ? <span className="ml-1 text-destructive">*</span> : null}
          </label>
        </div>
      </div>
    )
  }

  if (definition.fieldType === "dropdown") {
    const currentValue = coerceString(value)
    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium">
          {definition.name}
          {definition.required ? <span className="ml-1 text-destructive">*</span> : null}
        </label>
        <select
          id={fieldId}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          value={currentValue}
          onChange={(event) => onChange(event.target.value || null)}
          disabled={disabled}
          required={definition.required}
        >
          <option value="">Select an option</option>
          {definition.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (definition.fieldType === "date") {
    const currentValue = coerceString(value)
    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium">
          {definition.name}
          {definition.required ? <span className="ml-1 text-destructive">*</span> : null}
        </label>
        <Input
          id={fieldId}
          type="date"
          value={isIsoDateOnly(currentValue) ? currentValue : ""}
          onChange={(event) => onChange(event.target.value || null)}
          disabled={disabled}
          required={definition.required}
        />
      </div>
    )
  }

  if (definition.fieldType === "number") {
    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium">
          {definition.name}
          {definition.required ? <span className="ml-1 text-destructive">*</span> : null}
        </label>
        <Input
          id={fieldId}
          type="number"
          value={coerceNumber(value)}
          onChange={(event) => {
            const next = event.target.value
            if (next === "") {
              onChange(null)
              return
            }
            const parsed = Number(next)
            if (Number.isFinite(parsed)) {
              onChange(parsed)
            }
          }}
          disabled={disabled}
          required={definition.required}
        />
      </div>
    )
  }

  if (definition.fieldType === "currency") {
    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium">
          {definition.name}
          {definition.required ? <span className="ml-1 text-destructive">*</span> : null}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-sm text-muted-foreground">
            $
          </span>
          <Input
            id={fieldId}
            type="number"
            step="0.01"
            min="0"
            className="pl-7"
            value={coerceNumber(value)}
            onChange={(event) => {
              const next = event.target.value
              if (next === "") {
                onChange(null)
                return
              }
              const parsed = Number(next)
              if (Number.isFinite(parsed)) {
                onChange(parsed)
              }
            }}
            disabled={disabled}
            required={definition.required}
          />
        </div>
      </div>
    )
  }

  if (definition.fieldType === "url") {
    const currentValue = coerceString(value)

    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium">
          {definition.name}
          {definition.required ? <span className="ml-1 text-destructive">*</span> : null}
        </label>
        <Input
          id={fieldId}
          type="url"
          value={currentValue}
          placeholder="https://example.com"
          onChange={(event) => {
            const nextValue = event.target.value
            if (!nextValue.trim()) {
              setUrlError(null)
              onChange(null)
              return
            }

            try {
              new URL(nextValue)
              setUrlError(null)
            } catch {
              setUrlError("Enter a valid URL")
            }

            onChange(nextValue)
          }}
          disabled={disabled}
          required={definition.required}
        />
        {urlError ? <p className="text-xs text-destructive">{urlError}</p> : null}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {definition.name}
        {definition.required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      <Input
        id={fieldId}
        type="text"
        value={coerceString(value)}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={definition.required}
      />
    </div>
  )
}
