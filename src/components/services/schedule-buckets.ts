import type { ScheduledServiceItem } from "@/components/services/types";
import { getDaysUntil } from "@/lib/date-format";

export type BucketKey = "overdue" | "thisWeek" | "thisMonth" | "upcoming";

export const BUCKET_ORDER: BucketKey[] = [
  "overdue",
  "thisWeek",
  "thisMonth",
  "upcoming",
];

export const BUCKET_LABELS: Record<BucketKey, string> = {
  overdue: "Overdue",
  thisWeek: "Due this week",
  thisMonth: "Due this month",
  upcoming: "Later",
};

type BucketRow = Pick<ScheduledServiceItem, "nextServiceDate" | "reminderStartDate">;

/*
  Where a scheduled service sits on the Schedule tab. A row whose reminder
  window has not started yet stays in "Later" even if its date is close, so
  the Services header counts must use this same rule.
*/
export function bucketForRow(row: BucketRow, today: string): BucketKey {
  const diff = getDaysUntil(row.nextServiceDate, today);
  if (diff < 0) return "overdue";
  if (row.reminderStartDate > today) return "upcoming";
  if (diff <= 7) return "thisWeek";
  if (diff <= 30) return "thisMonth";
  return "upcoming";
}

export function groupByBucket<T extends BucketRow>(rows: T[], today: string) {
  const groups: Record<BucketKey, T[]> = {
    overdue: [],
    thisWeek: [],
    thisMonth: [],
    upcoming: [],
  };
  for (const row of rows) groups[bucketForRow(row, today)].push(row);
  for (const list of Object.values(groups)) {
    list.sort((a, b) => a.nextServiceDate.localeCompare(b.nextServiceDate));
  }
  return groups;
}
