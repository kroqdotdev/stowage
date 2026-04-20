"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

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

export function TagPicker({
  value,
  options,
  disabled = false,
  onChange,
}: {
  value: string[];
  options: TagPickerOption[];
  disabled?: boolean;
  onChange: (tagIds: string[]) => void;
}) {
  const selectedById = new Set(value);

  return (
    <div className="space-y-2">
      <div className="max-h-36 space-y-1 overflow-auto rounded-md border border-border/60 bg-background p-2">
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags defined.</p>
        ) : (
          options.map((tag) => {
            const checked = selectedById.has(tag.id);

            return (
              <label key={tag.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(nextChecked) =>
                    onChange(
                      nextChecked === true
                        ? addTagId(value, tag.id)
                        : removeTagId(value, tag.id),
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
            const tag = options.find((option) => option.id === tagId);
            if (!tag) {
              return null;
            }

            return (
              <Badge
                key={tag.id}
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
