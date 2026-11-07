/*
  Time forms. Long form in desktop tables and feeds ("Today 09:14",
  "Yesterday", "2 days ago", "3 weeks ago"); one short form everywhere else
  (09:14, 1d, 2d, 1w, 3w, 1mo). "Today" is written without a comma.
*/
function pad(value: number) {
  return String(value).padStart(2, "0");
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatRelativeTime(
  timestamp: number,
  now: Date = new Date(),
): { long: string; short: string } {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return { long: "—", short: "—" };

  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / dayMs,
  );

  if (days <= 0) return { long: `Today ${clock}`, short: clock };
  if (days === 1) return { long: "Yesterday", short: "1d" };
  if (days < 7) return { long: `${days} days ago`, short: `${days}d` };
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return {
      long: `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`,
      short: `${weeks}w`,
    };
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return {
      long: `${months} ${months === 1 ? "month" : "months"} ago`,
      short: `${months}mo`,
    };
  }
  const years = Math.floor(days / 365);
  return {
    long: `${years} ${years === 1 ? "year" : "years"} ago`,
    short: `${years}y`,
  };
}
