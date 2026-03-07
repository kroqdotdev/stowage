"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CrudModal } from "@/components/crud/modal";
import {
  FIELD_TYPE_OPTIONS,
  type FieldDefinition,
  type FieldType,
} from "./types";

type FieldDefinitionFormValues = {
  name: string;
  fieldType: FieldType;
  options: string[];
  required: boolean;
};

function getInitialOptions(definition: FieldDefinition | null) {
  if (!definition || definition.fieldType !== "dropdown") {
    return [""];
  }

  return definition.options.length > 0 ? definition.options : [""];
}

export function FieldDefinitionForm({
  open,
  mode,
  initialDefinition,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  initialDefinition: FieldDefinition | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: FieldDefinitionFormValues) => Promise<void>;
}) {
  const [name, setName] = useState(initialDefinition?.name ?? "");
  const [fieldType, setFieldType] = useState<FieldType>(
    initialDefinition?.fieldType ?? "text",
  );
  const [options, setOptions] = useState<string[]>(
    getInitialOptions(initialDefinition),
  );
  const [required, setRequired] = useState(
    initialDefinition?.required ?? false,
  );

  const isDropdown = fieldType === "dropdown";
  const showTypeChangeWarning =
    mode === "edit" &&
    initialDefinition !== null &&
    initialDefinition.fieldType !== fieldType &&
    initialDefinition.usageCount > 0;

  const normalizedDropdownOptions = useMemo(
    () =>
      options
        .map((option) => option.trim())
        .filter((option) => option.length > 0),
    [options],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      name,
      fieldType,
      options: isDropdown ? normalizedDropdownOptions : [],
      required,
    });
  }

  return (
    <CrudModal
      open={open}
      onClose={() => {
        if (!submitting) {
          onClose();
        }
      }}
      title={mode === "create" ? "Add field" : "Edit field"}
      description="Define custom fields used by assets."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="field-definition-form"
            className="cursor-pointer"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create field"
                : "Save changes"}
          </Button>
        </>
      }
    >
      <form
        id="field-definition-form"
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <div className="space-y-1.5">
          <label htmlFor="field-name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="field-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Serial number"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="field-type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="field-type"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={fieldType}
            onChange={(event) => setFieldType(event.target.value as FieldType)}
          >
            {FIELD_TYPE_OPTIONS.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {typeOption}
              </option>
            ))}
          </select>
        </div>

        {showTypeChangeWarning ? (
          <div className="rounded-md border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            This field already has saved values. Some type changes are blocked
            to prevent data loss.
          </div>
        ) : null}

        {isDropdown ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Dropdown options</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setOptions((prev) => [...prev, ""])}
              >
                <Plus className="h-4 w-4" />
                Add option
              </Button>
            </div>

            <div className="space-y-2">
              {options.map((option, index) => (
                <div
                  key={option}
                  className="flex items-center gap-2"
                >
                  <Input
                    aria-label={`Dropdown option ${index + 1}`}
                    value={option}
                    onChange={(event) =>
                      setOptions((prev) =>
                        prev.map((value, valueIndex) =>
                          valueIndex === index ? event.target.value : value,
                        ),
                      )
                    }
                    placeholder={`Option ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="cursor-pointer"
                    aria-label={`Remove option ${index + 1}`}
                    onClick={() =>
                      setOptions((prev) => {
                        if (prev.length <= 1) {
                          return [""];
                        }
                        return prev.filter(
                          (_, optionIndex) => optionIndex !== index,
                        );
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <input
            id="field-required"
            type="checkbox"
            className="h-4 w-4 rounded border border-input"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />
          <label htmlFor="field-required" className="text-sm font-medium">
            Required field
          </label>
        </div>
      </form>
    </CrudModal>
  );
}

export type { FieldDefinitionFormValues };
