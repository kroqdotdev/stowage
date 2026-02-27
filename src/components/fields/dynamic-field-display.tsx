import {
  DEFAULT_APP_DATE_FORMAT,
  formatDateFromIsoDateOnly,
  type AppDateFormat,
} from "@/lib/date-format"
import type { FieldDefinition, FieldValue } from "@/components/fields/types"

function isEmptyValue(value: FieldValue) {
  return value === null || value === undefined || value === ""
}

function formatCurrencyValue(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(value)
}

export function DynamicFieldDisplay({
  definition,
  value,
  dateFormat = DEFAULT_APP_DATE_FORMAT,
}: {
  definition: Pick<FieldDefinition, "fieldType">
  value: FieldValue
  dateFormat?: AppDateFormat
}) {
  if (isEmptyValue(value)) {
    return <span className="text-muted-foreground">—</span>
  }

  if (definition.fieldType === "checkbox") {
    return <span>{value === true ? "Yes" : "No"}</span>
  }

  if (definition.fieldType === "date") {
    return <span>{formatDateFromIsoDateOnly(String(value), dateFormat)}</span>
  }

  if (definition.fieldType === "currency") {
    const numericValue = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(numericValue)) {
      return <span className="text-muted-foreground">—</span>
    }
    return <span>{formatCurrencyValue(numericValue)}</span>
  }

  if (definition.fieldType === "url") {
    const href = String(value)
    const canOpenLink = href.startsWith("http://") || href.startsWith("https://")

    if (!canOpenLink) {
      return <span>{href}</span>
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline decoration-primary/40 underline-offset-2"
      >
        {href}
      </a>
    )
  }

  return <span>{String(value)}</span>
}
