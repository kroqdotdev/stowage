"use client";

import {
  DEFAULT_SERVICE_SCHEDULE_DRAFT,
  SERVICE_INTERVAL_UNIT_OPTIONS,
  type ServiceIntervalUnit,
  type ServiceScheduleDraft,
} from "@/components/assets/types";

type ParsedServiceSchedule =
  | {
      hasAnyInput: false;
      value: null;
      error: null;
    }
  | {
      hasAnyInput: true;
      value: null;
      error: string;
    }
  | {
      hasAnyInput: true;
      value: {
        nextServiceDate: string;
        intervalValue: number;
        intervalUnit: ServiceIntervalUnit;
        reminderLeadValue: number;
        reminderLeadUnit: ServiceIntervalUnit;
      };
      error: null;
    };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const INTERVAL_UNIT_WEIGHT_DAYS: Record<ServiceIntervalUnit, number> = {
  days: 1,
  weeks: 7,
  months: 30,
  years: 365,
};

function toComparableDays(value: number, unit: ServiceIntervalUnit) {
  return value * INTERVAL_UNIT_WEIGHT_DAYS[unit];
}

function parsePositiveInteger(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseNonNegativeInteger(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function parseServiceScheduleDraft(
  draft: ServiceScheduleDraft,
): ParsedServiceSchedule {
  const hasAnyInput =
    Boolean(draft.nextServiceDate.trim()) ||
    Boolean(draft.intervalValue.trim()) ||
    Boolean(draft.reminderLeadValue.trim());

  if (!hasAnyInput) {
    return { hasAnyInput: false, value: null, error: null };
  }

  if (!draft.nextServiceDate.trim()) {
    return {
      hasAnyInput: true,
      value: null,
      error: "Next service date is required when schedule is enabled.",
    };
  }

  if (!ISO_DATE_PATTERN.test(draft.nextServiceDate)) {
    return {
      hasAnyInput: true,
      value: null,
      error: "Next service date must use YYYY-MM-DD format.",
    };
  }

  const intervalValue = parsePositiveInteger(draft.intervalValue);
  if (intervalValue === null) {
    return {
      hasAnyInput: true,
      value: null,
      error: "Interval must be a positive integer.",
    };
  }

  const reminderLeadValue = parseNonNegativeInteger(draft.reminderLeadValue);
  if (reminderLeadValue === null) {
    return {
      hasAnyInput: true,
      value: null,
      error: "Reminder lead must be a non-negative integer.",
    };
  }

  const intervalComparable = toComparableDays(
    intervalValue,
    draft.intervalUnit,
  );
  const reminderComparable = toComparableDays(
    reminderLeadValue,
    draft.reminderLeadUnit,
  );

  if (reminderComparable > intervalComparable) {
    return {
      hasAnyInput: true,
      value: null,
      error: "Reminder lead must be less than or equal to interval.",
    };
  }

  return {
    hasAnyInput: true,
    value: {
      nextServiceDate: draft.nextServiceDate,
      intervalValue,
      intervalUnit: draft.intervalUnit,
      reminderLeadValue,
      reminderLeadUnit: draft.reminderLeadUnit,
    },
    error: null,
  };
}

export function ServiceScheduleFields({
  value,
  disabled,
  onChange,
  onClear,
}: {
  value: ServiceScheduleDraft;
  disabled: boolean;
  onChange: (next: ServiceScheduleDraft) => void;
  onClear: () => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-tight">
          Preventive schedule
        </h3>
        <p className="text-xs text-muted-foreground">
          Optional. If you set any schedule field, all schedule fields are
          required.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="service-next-date" className="text-sm font-medium">
            Next service date
          </label>
          <input
            id="service-next-date"
            type="date"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={value.nextServiceDate}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                nextServiceDate: event.target.value,
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Selecting today means service now, and the next due date is
            auto-shifted by interval on save.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="service-interval-value"
            className="text-sm font-medium"
          >
            Interval
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              id="service-interval-value"
              type="number"
              min={1}
              step={1}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={value.intervalValue}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...value,
                  intervalValue: event.target.value,
                })
              }
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={value.intervalUnit}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...value,
                  intervalUnit: event.target.value as ServiceIntervalUnit,
                })
              }
            >
              {SERVICE_INTERVAL_UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="service-reminder-value"
            className="text-sm font-medium"
          >
            Reminder lead
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              id="service-reminder-value"
              type="number"
              min={0}
              step={1}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={value.reminderLeadValue}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...value,
                  reminderLeadValue: event.target.value,
                })
              }
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={value.reminderLeadUnit}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...value,
                  reminderLeadUnit: event.target.value as ServiceIntervalUnit,
                })
              }
            >
              {SERVICE_INTERVAL_UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={onClear}
      >
        Clear schedule
      </button>
    </section>
  );
}

export function getDefaultServiceScheduleDraft() {
  return { ...DEFAULT_SERVICE_SCHEDULE_DRAFT };
}
