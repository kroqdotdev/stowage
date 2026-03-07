import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ServiceScheduleFields,
  parseServiceScheduleDraft,
} from "@/components/assets/service-schedule-fields";
import { DEFAULT_SERVICE_SCHEDULE_DRAFT } from "@/components/assets/types";

describe("service-schedule-fields", () => {
  it("renders helper copy for today auto-shift behavior", () => {
    render(
      <ServiceScheduleFields
        value={DEFAULT_SERVICE_SCHEDULE_DRAFT}
        disabled={false}
        onChange={() => {}}
        onClear={() => {}}
      />,
    );

    expect(
      screen.getByText(/service now, and the next due date is auto-shifted/i),
    ).toBeInTheDocument();
  });

  it("requires full schedule when any field is entered", () => {
    const result = parseServiceScheduleDraft({
      ...DEFAULT_SERVICE_SCHEDULE_DRAFT,
      nextServiceDate: "2026-03-04",
    });

    expect(result.error).toContain("Interval");
  });

  it("accepts valid schedule values", () => {
    const result = parseServiceScheduleDraft({
      nextServiceDate: "2026-03-04",
      intervalValue: "6",
      intervalUnit: "months",
      reminderLeadValue: "1",
      reminderLeadUnit: "months",
    });

    expect(result.error).toBeNull();
    expect(result.value).toEqual({
      nextServiceDate: "2026-03-04",
      intervalValue: 6,
      intervalUnit: "months",
      reminderLeadValue: 1,
      reminderLeadUnit: "months",
    });
  });
});
