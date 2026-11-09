"use client";

import {
  DEFAULT_SERVICE_SCHEDULE_DRAFT,
  SERVICE_INTERVAL_UNIT_OPTIONS,
  type ServiceIntervalUnit,
  type ServiceScheduleDraft,
} from "@/components/assets/types";
import { Input } from "@/components/ui/input";
import { SheetHeading } from "@/components/ui/sheet-heading";

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
  const unitSelect =
    "h-9 cursor-pointer rounded-md border-[1.5px] border-input bg-card px-2.5 text-sm appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2714%27%20height=%2714%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%234e524b%27%20stroke-width=%272.5%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27m6%209%206%206%206-6%27/%3E%3C/svg%3E')] bg-[length:14px] bg-[position:right_10px_center] bg-no-repeat pr-8 font-medium text-foreground outline-none focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50";
  const hasSchedule =
    Boolean(value.nextServiceDate.trim()) ||
    Boolean(value.intervalValue.trim()) ||
    Boolean(value.reminderLeadValue.trim());

  return (
    <section
      id="service"
      aria-labelledby="service-schedule-title"
      className="scroll-mt-20"
    >
      <SheetHeading
        title={<span id="service-schedule-title">Service schedule</span>}
        aside={
          hasSchedule ? (
            <button
              type="button"
              className="cursor-pointer text-sm font-medium text-ink-2 underline underline-offset-[3px] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
              onClick={onClear}
            >
              Clear schedule
            </button>
          ) : null
        }
      />
      <p className="px-0.5 pt-1.5 text-[13px] text-muted-foreground">
        Optional. If you set any schedule field, all schedule fields are
        required.
      </p>

      <div className="grid gap-x-6 gap-y-4 px-0.5 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <label htmlFor="service-next-date" className="text-sm font-semibold">
            Next service date
          </label>
          <Input
            id="service-next-date"
            type="date"
            className="w-full"
            value={value.nextServiceDate}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                nextServiceDate: event.target.value,
              })
            }
          />
          <p className="text-[13px] text-muted-foreground">
            Selecting today means service now, and the next due date is
            auto-shifted by interval on save.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="service-interval-value"
            className="text-sm font-semibold"
          >
            Interval
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              id="service-interval-value"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="6"
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
              aria-label="Interval unit"
              className={unitSelect}
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
            className="text-sm font-semibold"
          >
            Reminder lead
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              id="service-reminder-value"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="1"
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
              aria-label="Reminder unit"
              className={unitSelect}
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
    </section>
  );
}

export function getDefaultServiceScheduleDraft() {
  return { ...DEFAULT_SERVICE_SCHEDULE_DRAFT };
}
