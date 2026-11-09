"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { FieldValue, type FieldDefinition } from "@/components/fields/types";
import { isIsoDateOnly } from "@/lib/date-format";

function coerceString(value: FieldValue) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function coerceNumber(value: FieldValue) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function coerceCheckbox(value: FieldValue) {
  return value === true;
}

/*
  Workshop form labels: 14px semibold; optional fields say so in muted text.
  The marker sits outside the <label> so the accessible name stays the
  field name.
*/
function FieldLabel({
  htmlFor,
  definition,
  inline = false,
}: {
  htmlFor: string;
  definition: Pick<FieldDefinition, "name" | "required">;
  inline?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <label
        htmlFor={htmlFor}
        className={
          inline
            ? "cursor-pointer text-sm font-semibold"
            : "text-sm font-semibold"
        }
      >
        {definition.name}
      </label>
      {!definition.required && !inline ? (
        <span className="text-sm text-muted-foreground">optional</span>
      ) : null}
    </div>
  );
}

export function DynamicField({
  definition,
  value,
  onChange,
  disabled = false,
}: {
  definition: Pick<
    FieldDefinition,
    "name" | "fieldType" | "options" | "required"
  >;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  disabled?: boolean;
}) {
  const fieldId = useId();
  const [urlError, setUrlError] = useState<string | null>(null);

  if (definition.fieldType === "checkbox") {
    const checked = coerceCheckbox(value);

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            id={fieldId}
            type="checkbox"
            className="size-[18px] cursor-pointer accent-[var(--foreground)]"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
          />
          <FieldLabel htmlFor={fieldId} definition={definition} inline />
        </div>
      </div>
    );
  }

  if (definition.fieldType === "dropdown") {
    const currentValue = coerceString(value);
    return (
      <div className="space-y-1.5">
        <FieldLabel htmlFor={fieldId} definition={definition} />
        <select
          id={fieldId}
          className="h-9 w-full cursor-pointer rounded-md border-[1.5px] border-input bg-card px-3 text-sm appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2714%27%20height=%2714%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%234e524b%27%20stroke-width=%272.5%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27m6%209%206%206%206-6%27/%3E%3C/svg%3E')] bg-[length:14px] bg-[position:right_10px_center] bg-no-repeat pr-8 font-medium text-foreground outline-none focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
    );
  }

  if (definition.fieldType === "date") {
    const currentValue = coerceString(value);
    return (
      <div className="space-y-1.5">
        <FieldLabel htmlFor={fieldId} definition={definition} />
        <Input
          id={fieldId}
          type="date"
          value={isIsoDateOnly(currentValue) ? currentValue : ""}
          onChange={(event) => onChange(event.target.value || null)}
          disabled={disabled}
          required={definition.required}
        />
      </div>
    );
  }

  if (definition.fieldType === "number") {
    return (
      <div className="space-y-1.5">
        <FieldLabel htmlFor={fieldId} definition={definition} />
        <Input
          id={fieldId}
          type="number"
          value={coerceNumber(value)}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "") {
              onChange(null);
              return;
            }
            const parsed = Number(next);
            if (Number.isFinite(parsed)) {
              onChange(parsed);
            }
          }}
          disabled={disabled}
          required={definition.required}
        />
      </div>
    );
  }

  if (definition.fieldType === "currency") {
    return (
      <div className="space-y-1.5">
        <FieldLabel htmlFor={fieldId} definition={definition} />
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
              const next = event.target.value;
              if (next === "") {
                onChange(null);
                return;
              }
              const parsed = Number(next);
              if (Number.isFinite(parsed)) {
                onChange(parsed);
              }
            }}
            disabled={disabled}
            required={definition.required}
          />
        </div>
      </div>
    );
  }

  if (definition.fieldType === "url") {
    const currentValue = coerceString(value);

    return (
      <div className="space-y-1.5">
        <FieldLabel htmlFor={fieldId} definition={definition} />
        <Input
          id={fieldId}
          type="url"
          value={currentValue}
          placeholder="https://example.com"
          onChange={(event) => {
            const nextValue = event.target.value;
            if (!nextValue.trim()) {
              setUrlError(null);
              onChange(null);
              return;
            }

            try {
              new URL(nextValue);
              setUrlError(null);
            } catch {
              setUrlError("Enter a valid URL");
            }

            onChange(nextValue);
          }}
          disabled={disabled}
          required={definition.required}
        />
        {urlError ? (
          <p className="text-sm font-medium text-destructive">{urlError}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={fieldId} definition={definition} />
      <Input
        id={fieldId}
        type="text"
        value={coerceString(value)}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={definition.required}
      />
    </div>
  );
}
