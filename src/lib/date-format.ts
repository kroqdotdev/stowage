export const APP_DATE_FORMAT_OPTIONS = [
  "DD-MM-YYYY",
  "MM-DD-YYYY",
  "YYYY-MM-DD",
] as const;

export type AppDateFormat = (typeof APP_DATE_FORMAT_OPTIONS)[number];

export const DEFAULT_APP_DATE_FORMAT: AppDateFormat = "DD-MM-YYYY";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateParts(
  year: number,
  month: number,
  day: number,
  format: AppDateFormat,
) {
  const yyyy = String(year);
  const mm = pad2(month);
  const dd = pad2(day);

  switch (format) {
    case "MM-DD-YYYY":
      return `${mm}-${dd}-${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
    case "DD-MM-YYYY":
    default:
      return `${dd}-${mm}-${yyyy}`;
  }
}

export function formatDateFromTimestamp(
  timestamp: number,
  format: AppDateFormat,
) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return formatDateParts(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    format,
  );
}

export function isIsoDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function formatDateFromIsoDateOnly(
  isoDate: string,
  format: AppDateFormat,
) {
  if (!isIsoDateOnly(isoDate)) {
    return isoDate;
  }

  const [yearRaw, monthRaw, dayRaw] = isoDate.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return isoDate;
  }

  return formatDateParts(year, month, day, format);
}
