"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type TagPickerOption = {
  id: string;
  name: string;
  color: string;
};

function addTagId(tagIds: string[], tagId: string) {
  if (tagIds.includes(tagId)) {
    return tagIds;
  }

  return [...tagIds, tagId];
}

function removeTagId(tagIds: string[], tagId: string) {
  return tagIds.filter((candidate) => candidate !== tagId);
}

/*
  Keywords (stored as tags) as toggle chips: the tinted keyword chip when
  off, ink with a tick when on. Ink = what you have ticked.
*/
export function TagPicker({
  value,
  options,
  disabled = false,
  labelledBy,
  onChange,
}: {
  value: string[];
  options: TagPickerOption[];
  disabled?: boolean;
  labelledBy?: string;
  onChange: (tagIds: string[]) => void;
}) {
  const selectedById = new Set(value);

  if (options.length === 0) {
    return (
      <p className="py-1.5 text-sm text-ink-2">
        No keywords yet. Add them under Taxonomy.
      </p>
    );
  }

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-1.5"
    >
      {options.map((tag) => {
        const checked = selectedById.has(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={checked}
            disabled={disabled}
            onClick={() =>
              onChange(
                checked ? removeTagId(value, tag.id) : addTagId(value, tag.id),
              )
            }
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              checked
                ? "bg-foreground text-background"
                : "bg-chip text-foreground hover:bg-line-2",
            )}
          >
            {checked ? (
              <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
            ) : (
              <span className="text-muted-foreground" aria-hidden="true">
                #
              </span>
            )}
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
