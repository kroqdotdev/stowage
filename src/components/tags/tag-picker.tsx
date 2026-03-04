"use client";

import type { Id } from "@/lib/convex-api";
import { Badge } from "@/components/ui/badge";

export type TagPickerOption = {
  _id: Id<"tags">;
  name: string;
  color: string;
};

function addTagId(tagIds: Id<"tags">[], tagId: Id<"tags">) {
  if (tagIds.includes(tagId)) {
    return tagIds;
  }

  return [...tagIds, tagId];
}

function removeTagId(tagIds: Id<"tags">[], tagId: Id<"tags">) {
  return tagIds.filter((candidate) => candidate !== tagId);
}

export function TagPicker({
  value,
  options,
  disabled = false,
  onChange,
}: {
  value: Id<"tags">[];
  options: TagPickerOption[];
  disabled?: boolean;
  onChange: (tagIds: Id<"tags">[]) => void;
}) {
  const selectedById = new Set(value);

  return (
    <div className="space-y-2">
      <div className="max-h-36 space-y-1 overflow-auto rounded-md border border-border/60 bg-background p-2">
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags defined.</p>
        ) : (
          options.map((tag) => {
            const checked = selectedById.has(tag._id);

            return (
              <label key={tag._id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? addTagId(value, tag._id)
                        : removeTagId(value, tag._id),
                    )
                  }
                />
                <span>{tag.name}</span>
              </label>
            );
          })
        )}
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((tagId) => {
            const tag = options.find((option) => option._id === tagId);
            if (!tag) {
              return null;
            }

            return (
              <Badge
                key={tag._id}
                className="border border-border/60 bg-muted/20 text-xs"
              >
                {tag.name}
              </Badge>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
