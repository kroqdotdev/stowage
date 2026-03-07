"use client";

import { useEffect, useState } from "react";

export function getUtcTodayIsoDate(timestamp = Date.now()) {
  const now = new Date(timestamp);
  const year = String(now.getUTCFullYear()).padStart(4, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDelayUntilNextUtcDay(timestamp = Date.now()) {
  const now = new Date(timestamp);
  const nextUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    1,
  );

  return Math.max(nextUtcMidnight - timestamp, 1_000);
}

export function useTodayIsoDate() {
  const [today, setToday] = useState(() => getUtcTodayIsoDate());

  useEffect(() => {
    let timerId: number | undefined;

    function scheduleNextTick() {
      timerId = window.setTimeout(() => {
        setToday(getUtcTodayIsoDate());
        scheduleNextTick();
      }, getDelayUntilNextUtcDay());
    }

    scheduleNextTick();

    return () => {
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  return today;
}
