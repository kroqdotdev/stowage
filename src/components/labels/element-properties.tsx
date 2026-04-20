"use client";

import type { FieldDefinition } from "@/components/fields/types";
import {
  LABEL_DIMENSION_PRESETS,
  formatLabelDimensions,
  getLabelElementLabel,
  isTextLabelElement,
  roundMm,
} from "@/components/labels/helpers";
import type {
  EditableLabelTemplate,
  LabelTemplateElement,
} from "@/components/labels/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function ElementProperties({
  template,
  selectedElement,
  fieldDefinitions,
  canEdit,
  dirty,
  saving,
  deleting,
  onTemplateChange,
  onSelectPreset,
  onChangeElement,
  onDeleteElement,
  onCreateTemplate,
  onDeleteTemplate,
  onSave,
}: {
  template: EditableLabelTemplate;
  selectedElement: LabelTemplateElement | null;
  fieldDefinitions: FieldDefinition[];
  canEdit: boolean;
  dirty: boolean;
  saving: boolean;
  deleting: boolean;
  onTemplateChange: (
    updater: (template: EditableLabelTemplate) => EditableLabelTemplate,
  ) => void;
  onSelectPreset: (widthMm: number, heightMm: number) => void;
  onChangeElement: (
    elementId: string,
    updater: (element: LabelTemplateElement) => LabelTemplateElement,
  ) => void;
  onDeleteElement: (elementId: string) => void;
  onCreateTemplate: () => void;
  onDeleteTemplate: () => void;
  onSave: () => void;
}) {
  return (
    <aside className="space-y-4">
      <section className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Template</h3>
            <p className="text-xs text-muted-foreground">
              Saved as{" "}
              {template._id ? "an existing template" : "a new template draft"}.
            </p>
          </div>
          <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground">
            {formatLabelDimensions(template.widthMm, template.heightMm)}
          </span>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="label-template-name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="label-template-name"
            value={template.name}
            disabled={!canEdit}
            onChange={(event) =>
              onTemplateChange((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            placeholder="Thermal asset label"
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">Size presets</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {LABEL_DIMENSION_PRESETS.map((preset) => {
              const active =
                template.widthMm === preset.widthMm &&
                template.heightMm === preset.heightMm;
              return (
                <Button
                  key={preset.label}
                  type="button"
                  variant={active ? "default" : "outline"}
                  className="cursor-pointer justify-start"
                  disabled={!canEdit}
                  onClick={() =>
                    onSelectPreset(preset.widthMm, preset.heightMm)
                  }
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="label-template-width"
              className="text-sm font-medium"
            >
              Width (mm)
            </label>
            <Input
              id="label-template-width"
              type="number"
              min={1}
              step={0.5}
              value={template.widthMm}
              disabled={!canEdit}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) {
                  return;
                }
                onTemplateChange((current) => ({
                  ...current,
                  widthMm: roundMm(value),
                }));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="label-template-height"
              className="text-sm font-medium"
            >
              Height (mm)
            </label>
            <Input
              id="label-template-height"
              type="number"
              min={1}
              step={0.5}
              value={template.heightMm}
              disabled={!canEdit}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) {
                  return;
                }
                onTemplateChange((current) => ({
                  ...current,
                  heightMm: roundMm(value),
                }));
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/80 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Default template</p>
            <p className="text-xs text-muted-foreground">
              New print previews will use this template automatically.
            </p>
          </div>
          <Switch
            checked={template.isDefault}
            disabled={!canEdit}
            onCheckedChange={(checked) =>
              onTemplateChange((current) => ({
                ...current,
                isDefault: checked,
              }))
            }
            aria-label="Toggle default template"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="cursor-pointer"
            disabled={!canEdit || saving || !dirty}
            onClick={onSave}
            data-label-template-save
          >
            {saving
              ? "Saving..."
              : template._id
                ? "Save changes"
                : "Save template"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={!canEdit || saving}
            onClick={onCreateTemplate}
          >
            New template
          </Button>
          {template._id ? (
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={!canEdit || saving || deleting || template.isDefault}
              onClick={onDeleteTemplate}
            >
              {deleting ? "Deleting..." : "Delete template"}
            </Button>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          {dirty ? "Unsaved changes" : "All changes saved locally"}
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            Selected element
          </h3>
          <p className="text-xs text-muted-foreground">
            Fine tune placement, size, and display settings.
          </p>
        </div>

        {selectedElement ? (
          <>
            <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm">
              {getLabelElementLabel(selectedElement.type)}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="label-element-x"
                  className="text-sm font-medium"
                >
                  X (mm)
                </label>
                <Input
                  id="label-element-x"
                  type="number"
                  step={0.5}
                  value={selectedElement.xMm}
                  disabled={!canEdit}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) {
                      return;
                    }
                    onChangeElement(selectedElement.id, (element) => ({
                      ...element,
                      xMm: roundMm(value),
                    }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="label-element-y"
                  className="text-sm font-medium"
                >
                  Y (mm)
                </label>
                <Input
                  id="label-element-y"
                  type="number"
                  step={0.5}
                  value={selectedElement.yMm}
                  disabled={!canEdit}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) {
                      return;
                    }
                    onChangeElement(selectedElement.id, (element) => ({
                      ...element,
                      yMm: roundMm(value),
                    }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="label-element-width"
                  className="text-sm font-medium"
                >
                  Width (mm)
                </label>
                <Input
                  id="label-element-width"
                  type="number"
                  step={0.5}
                  min={1}
                  value={selectedElement.widthMm}
                  disabled={!canEdit}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) {
                      return;
                    }
                    onChangeElement(selectedElement.id, (element) => ({
                      ...element,
                      widthMm: roundMm(value),
                    }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="label-element-height"
                  className="text-sm font-medium"
                >
                  Height (mm)
                </label>
                <Input
                  id="label-element-height"
                  type="number"
                  step={0.5}
                  min={1}
                  value={selectedElement.heightMm}
                  disabled={!canEdit}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) {
                      return;
                    }
                    onChangeElement(selectedElement.id, (element) => ({
                      ...element,
                      heightMm: roundMm(value),
                    }));
                  }}
                />
              </div>
            </div>

            {selectedElement.type === "staticText" ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="label-element-text"
                  className="text-sm font-medium"
                >
                  Text
                </label>
                <Textarea
                  id="label-element-text"
                  value={selectedElement.text ?? ""}
                  disabled={!canEdit}
                  onChange={(event) =>
                    onChangeElement(selectedElement.id, (element) => ({
                      ...element,
                      text: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
            ) : null}

            {selectedElement.type === "customField" ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="label-element-field"
                  className="text-sm font-medium"
                >
                  Field
                </label>
                <Select
                  value={String(selectedElement.fieldId ?? "")}
                  onValueChange={(value) =>
                    onChangeElement(selectedElement.id, (element) => ({
                      ...element,
                      fieldId: value as LabelTemplateElement["fieldId"],
                    }))
                  }
                  disabled={!canEdit || fieldDefinitions.length === 0}
                >
                  <SelectTrigger id="label-element-field" className="w-full">
                    <SelectValue placeholder="Select a custom field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldDefinitions.map((field) => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {isTextLabelElement(selectedElement.type) ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="label-element-font-size"
                      className="text-sm font-medium"
                    >
                      Font size (pt)
                    </label>
                    <Input
                      id="label-element-font-size"
                      type="number"
                      step={0.5}
                      min={1}
                      value={selectedElement.fontSize ?? 8}
                      disabled={!canEdit}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (!Number.isFinite(value)) {
                          return;
                        }
                        onChangeElement(selectedElement.id, (element) => ({
                          ...element,
                          fontSize: roundMm(value),
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Weight</label>
                    <Select
                      value={selectedElement.fontWeight ?? "normal"}
                      onValueChange={(value) =>
                        onChangeElement(selectedElement.id, (element) => ({
                          ...element,
                          fontWeight:
                            value as LabelTemplateElement["fontWeight"],
                        }))
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="semibold">Semibold</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Alignment</label>
                    <Select
                      value={selectedElement.textAlign ?? "left"}
                      onValueChange={(value) =>
                        onChangeElement(selectedElement.id, (element) => ({
                          ...element,
                          textAlign: value as LabelTemplateElement["textAlign"],
                        }))
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium">Uppercase</span>
                    <div className="flex h-9 items-center justify-between rounded-md border border-border/70 bg-background px-3">
                      <span className="text-sm text-muted-foreground">
                        Transform text
                      </span>
                      <Switch
                        checked={selectedElement.uppercase === true}
                        disabled={!canEdit}
                        onCheckedChange={(checked) =>
                          onChangeElement(selectedElement.id, (element) => ({
                            ...element,
                            uppercase: checked ? true : undefined,
                          }))
                        }
                        aria-label="Toggle uppercase"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {selectedElement.type === "barcode" ||
            selectedElement.type === "dataMatrix" ? (
              <p className="text-xs text-muted-foreground">
                The asset detail URL is encoded automatically when labels are
                printed.
              </p>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={!canEdit}
              onClick={() => onDeleteElement(selectedElement.id)}
            >
              Remove element
            </Button>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-background/60 px-4 py-6 text-sm text-muted-foreground">
            Select an element on the canvas to edit its settings.
          </div>
        )}
      </section>
    </aside>
  );
}
