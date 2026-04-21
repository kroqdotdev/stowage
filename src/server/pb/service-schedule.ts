import { ValidationError } from "./errors";

export const SERVICE_INTERVAL_UNITS = [
  "days",
  "weeks",
  "months",
  "years",
] as const;

export type ServiceIntervalUnit = (typeof SERVICE_INTERVAL_UNITS)[number];

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function formatIsoDate(date: Date) {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  if (!ISO_DATE_ONLY_PATTERN.test(value)) {
    throw new ValidationError("Date must use YYYY-MM-DD format");
  }
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new ValidationError("Date must use YYYY-MM-DD format");
  }
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new ValidationError("Date is invalid");
  }
  return candidate;
}

export function requireIsoDate(value: string) {
  return formatIsoDate(parseIsoDate(value));
}

function applyInterval(date: Date, value: number, unit: ServiceIntervalUnit) {
  const next = new Date(date.getTime());
  if (unit === "days") {
    next.setUTCDate(next.getUTCDate() + value);
    return next;
  }
  if (unit === "weeks") {
    next.setUTCDate(next.getUTCDate() + value * 7);
    return next;
  }
  if (unit === "months") {
    next.setUTCMonth(next.getUTCMonth() + value);
    return next;
  }
  next.setUTCFullYear(next.getUTCFullYear() + value);
  return next;
}

function requirePositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${label} must be a positive integer`);
  }
}

function requireNonNegativeInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${label} must be a non-negative integer`);
  }
}

function getDurationMsFromAnchor(value: number, unit: ServiceIntervalUnit) {
  const anchor = parseIsoDate("2024-01-01");
  const shifted = applyInterval(anchor, value, unit);
  return shifted.getTime() - anchor.getTime();
}

export function normalizeServiceIntervalUnit(
  value: string,
): ServiceIntervalUnit {
  if ((SERVICE_INTERVAL_UNITS as readonly string[]).includes(value)) {
    return value as ServiceIntervalUnit;
  }
  throw new ValidationError("Interval unit is invalid");
}

export function ensureReminderWithinInterval({
  intervalValue,
  intervalUnit,
  reminderLeadValue,
  reminderLeadUnit,
}: {
  intervalValue: number;
  intervalUnit: ServiceIntervalUnit;
  reminderLeadValue: number;
  reminderLeadUnit: ServiceIntervalUnit;
}) {
  requirePositiveInteger(intervalValue, "Interval value");
  requireNonNegativeInteger(reminderLeadValue, "Reminder lead value");
  const intervalDuration = getDurationMsFromAnchor(intervalValue, intervalUnit);
  const reminderDuration = getDurationMsFromAnchor(
    reminderLeadValue,
    reminderLeadUnit,
  );
  if (reminderDuration > intervalDuration) {
    throw new ValidationError(
      "Reminder lead must be less than or equal to interval",
    );
  }
}

export function getTodayIsoDate(nowMs = Date.now()) {
  return formatIsoDate(new Date(nowMs));
}

export function addIntervalToIsoDate({
  date,
  value,
  unit,
}: {
  date: string;
  value: number;
  unit: ServiceIntervalUnit;
}) {
  requirePositiveInteger(value, "Interval value");
  return formatIsoDate(applyInterval(parseIsoDate(date), value, unit));
}

export function subtractIntervalFromIsoDate({
  date,
  value,
  unit,
}: {
  date: string;
  value: number;
  unit: ServiceIntervalUnit;
}) {
  requireNonNegativeInteger(value, "Reminder lead value");
  return formatIsoDate(applyInterval(parseIsoDate(date), value * -1, unit));
}

export function getMonthRange({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    throw new ValidationError("Year is invalid");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new ValidationError("Month is invalid");
  }
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, month, 1));
  return {
    monthStart: formatIsoDate(monthStart),
    nextMonthStart: formatIsoDate(nextMonthStart),
  };
}

export function getUpcomingRange({ days }: { days: number }) {
  requirePositiveInteger(days, "Days");
  const startDate = getTodayIsoDate();
  const endDate = addIntervalToIsoDate({
    date: startDate,
    value: days,
    unit: "days",
  });
  return { startDate, endDate };
}
