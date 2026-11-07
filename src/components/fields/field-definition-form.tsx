"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CrudModal } from "@/components/crud/modal";
import {
  FIELD_TYPE_OPTIONS,
  type FieldDefinition,
  type FieldType,
} from "./types";

const TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
  checkbox: "Checkbox",
  url: "URL",
  currency: "Currency",
};

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
      title={mode === "create" ? "New field" : "Edit field"}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="field-definition-form"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="animate-spin" /> : null}
            {submitting
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create field"
                : "Save field"}
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
          <label htmlFor="field-name" className="text-sm font-semibold">
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
          <label htmlFor="field-type" className="text-sm font-semibold">
            Type
          </label>
          <select
            id="field-type"
            className="h-9 w-full cursor-pointer rounded-md border-[1.5px] border-input bg-card px-3 text-sm appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2714%27%20height=%2714%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%234e524b%27%20stroke-width=%272.5%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27m6%209%206%206%206-6%27/%3E%3C/svg%3E')] bg-[length:14px] bg-[position:right_10px_center] bg-no-repeat pr-8 font-medium text-foreground outline-none focus-visible:border-foreground"
            value={fieldType}
            onChange={(event) => setFieldType(event.target.value as FieldType)}
          >
            {FIELD_TYPE_OPTIONS.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {TYPE_LABELS[typeOption]}
              </option>
            ))}
          </select>
        </div>

        {showTypeChangeWarning ? (
          <p className="flex items-start gap-1.5 text-sm font-medium text-repair">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              This field already has saved values. Some type changes are blocked
              to prevent data loss.
            </span>
          </p>
        ) : null}

        {isDropdown ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Dropdown options</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOptions((prev) => [...prev, ""])}
              >
                <Plus />
                Add option
              </Button>
            </div>

            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={option} className="flex items-center gap-2">
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
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2.5">
          <Checkbox
            id="field-required"
            checked={required}
            onCheckedChange={(checked) => setRequired(checked === true)}
          />
          <label
            htmlFor="field-required"
            className="cursor-pointer text-sm font-semibold"
          >
            Required field
          </label>
        </div>
      </form>
    </CrudModal>
  );
}

export type { FieldDefinitionFormValues };
