"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { CrudModal } from "@/components/crud/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LocationTreeItem } from "@/components/locations/location-utils";

type FormState = {
  name: string;
  parentId: string | null;
  description: string;
};

function buildPathPreview(locations: LocationTreeItem[], form: FormState) {
  const name = form.name.trim();
  if (!name) return "";
  const parentPath =
    form.parentId == null
      ? null
      : (locations.find((location) => location.id === form.parentId)?.path ?? null);
  return parentPath ? `${parentPath} / ${name}` : name;
}

/*
  One dialog for creating and editing a location: name, where it sits, an
  optional description, and the resulting path.
*/
export function LocationFormDialog({
  open,
  mode = "create",
  locations,
  excludeParentIds,
  values,
  submitting,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  mode?: "create" | "edit";
  locations: LocationTreeItem[];
  /* A location can't sit inside itself or its own descendants. */
  excludeParentIds?: Set<string>;
  values: FormState;
  submitting: boolean;
  onClose: () => void;
  onChange: (next: FormState) => void;
  onSubmit: (values: {
    name: string;
    parentId: string | null;
    description: string | null;
  }) => Promise<void>;
}) {
  const parentOptions = useMemo(
    () =>
      locations
        .filter((location) => !excludeParentIds?.has(location.id))
        .sort((a, b) =>
          a.path.localeCompare(b.path, undefined, { sensitivity: "base" }),
        ),
    [locations, excludeParentIds],
  );
  const pathPreview = buildPathPreview(locations, values);
  const editing = mode === "edit";

  return (
    <CrudModal
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={editing ? "Edit location" : "New location"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="location-form" disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin" /> : null}
            {editing
              ? submitting
                ? "Saving..."
                : "Save location"
              : submitting
                ? "Creating..."
                : "Create location"}
          </Button>
        </>
      }
    >
      <form
        id="location-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit({
            name: values.name,
            parentId: values.parentId,
            description: values.description.trim() ? values.description : null,
          });
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="location-form-name" className="text-sm font-semibold">
            Name
          </label>
          <Input
            id="location-form-name"
            value={values.name}
            onChange={(event) => onChange({ ...values, name: event.target.value })}
            placeholder="Shelf 3"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label id="location-form-parent-label" className="text-sm font-semibold">
            Inside
          </label>
          <Select
            value={values.parentId ?? "__none__"}
            onValueChange={(value) =>
              onChange({ ...values, parentId: value === "__none__" ? null : value })
            }
          >
            <SelectTrigger className="w-full" aria-labelledby="location-form-parent-label">
              <SelectValue placeholder="Nothing, it is a site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nothing, it is a site</SelectItem>
              {parentOptions.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.path}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="location-form-description" className="text-sm font-semibold">
            Description <span className="font-normal text-muted-foreground">optional</span>
          </label>
          <Textarea
            id="location-form-description"
            value={values.description}
            onChange={(event) => onChange({ ...values, description: event.target.value })}
            placeholder="Long bench by the window"
          />
        </div>

        <p className="text-sm text-ink-2">
          Path:{" "}
          <span className="font-medium text-foreground">
            {pathPreview || "Enter a name to see the path"}
          </span>
        </p>
      </form>
    </CrudModal>
  );
}
