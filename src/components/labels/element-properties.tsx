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
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelFooter } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
  /* New template lives in the template strip; kept for API compatibility. */
  onCreateTemplate?: () => void;
  onDeleteTemplate: () => void;
  onSave: () => void;
}) {
  return (
    <aside className="space-y-6">
      <Panel>
        <PanelBody className="space-y-4 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="eyebrow">Template</h3>
            <span className="font-mono text-[13px] font-medium text-ink-2">
              {formatLabelDimensions(template.widthMm, template.heightMm)}
            </span>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="label-template-name"
              className="text-sm font-semibold"
            >
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
            <span
              id="label-size-presets"
              className="block text-sm font-semibold"
            >
              Size
            </span>
            <div
              className="grid grid-cols-2 overflow-hidden rounded-md border-[1.5px] border-input"
              role="group"
              aria-labelledby="label-size-presets"
            >
              {LABEL_DIMENSION_PRESETS.map((preset) => {
                const active =
                  template.widthMm === preset.widthMm &&
                  template.heightMm === preset.heightMm;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={active}
                    className={cn(
                      "h-[33px] cursor-pointer font-mono text-[13px] font-medium transition-colors not-first:border-l-[1.5px] not-first:border-input disabled:cursor-not-allowed disabled:opacity-50",
                      active
                        ? "bg-foreground text-background"
                        : "bg-card text-ink-2 hover:bg-secondary hover:text-foreground",
                    )}
                    disabled={!canEdit}
                    onClick={() =>
                      onSelectPreset(preset.widthMm, preset.heightMm)
                    }
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="label-template-width"
                className="text-sm font-semibold"
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
                className="text-sm font-semibold"
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

          <div className="flex items-start gap-2.5">
            <Checkbox
              id="label-template-default"
              className="mt-px"
              checked={template.isDefault}
              disabled={!canEdit}
              onCheckedChange={(checked) =>
                onTemplateChange((current) => ({
                  ...current,
                  isDefault: checked === true,
                }))
              }
            />
            <label htmlFor="label-template-default" className="cursor-pointer">
              <span className="block text-sm font-semibold">
                Default template
              </span>
              <span className="block text-[13px] text-ink-2">
                New print previews use this template.
              </span>
            </label>
          </div>
        </PanelBody>

        <PanelFooter className="flex-wrap">
          <Button
            type="button"
            disabled={!canEdit || saving || !dirty}
            onClick={onSave}
            data-label-template-save
          >
            {saving
              ? "Saving..."
              : template.id
                ? "Save changes"
                : "Save template"}
          </Button>
          <span className="text-[13px] text-muted-foreground">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          {template.id && template.isDefault ? (
            // A disabled button can't explain itself (no hover, often skipped
            // by screen readers), so the default template says it in text.
            <span className="ml-auto text-[13px] text-muted-foreground">
              Default template, can&apos;t be deleted
            </span>
          ) : template.id ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="ml-auto text-destructive hover:text-destructive"
              disabled={!canEdit || saving || deleting}
              onClick={onDeleteTemplate}
              aria-label={deleting ? "Deleting..." : "Delete template…"}
              title="Delete template…"
            >
              <Trash2 />
            </Button>
          ) : null}
        </PanelFooter>
      </Panel>

      <Panel>
        <PanelBody className="space-y-4 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="eyebrow">Selected element</h3>
            {selectedElement ? (
              <span className="text-sm font-semibold text-foreground">
                {getLabelElementLabel(selectedElement.type)}
              </span>
            ) : null}
          </div>

          {selectedElement ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="label-element-x"
                    className="text-sm font-semibold"
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
                    className="text-sm font-semibold"
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
                    className="text-sm font-semibold"
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
                    className="text-sm font-semibold"
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
                    className="text-sm font-semibold"
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
                    className="text-sm font-semibold"
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="label-element-font-size"
                        className="text-sm font-semibold"
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
                      <label
                        id="label-element-weight"
                        className="text-sm font-semibold"
                      >
                        Weight
                      </label>
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
                        <SelectTrigger
                          className="w-full"
                          aria-labelledby="label-element-weight"
                        >
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
                      <label
                        id="label-element-align"
                        className="text-sm font-semibold"
                      >
                        Alignment
                      </label>
                      <Select
                        value={selectedElement.textAlign ?? "left"}
                        onValueChange={(value) =>
                          onChangeElement(selectedElement.id, (element) => ({
                            ...element,
                            textAlign:
                              value as LabelTemplateElement["textAlign"],
                          }))
                        }
                        disabled={!canEdit}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-labelledby="label-element-align"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2.5 sm:col-span-2">
                      <Checkbox
                        id="label-element-uppercase"
                        checked={selectedElement.uppercase === true}
                        disabled={!canEdit}
                        onCheckedChange={(checked) =>
                          onChangeElement(selectedElement.id, (element) => ({
                            ...element,
                            uppercase: checked === true ? true : undefined,
                          }))
                        }
                      />
                      <label
                        htmlFor="label-element-uppercase"
                        className="cursor-pointer text-sm font-semibold"
                      >
                        Uppercase
                      </label>
                    </div>
                  </div>
                </>
              ) : null}

              {selectedElement.type === "barcode" ||
              selectedElement.type === "dataMatrix" ? (
                <p className="text-[13px] text-muted-foreground">
                  The asset detail URL is encoded automatically when labels are
                  printed.
                </p>
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canEdit}
                onClick={() => onDeleteElement(selectedElement.id)}
              >
                <X />
                Remove element
              </Button>
            </>
          ) : (
            <p className="text-sm text-ink-2">
              Select an element on the canvas to edit its settings.
            </p>
          )}
        </PanelBody>
      </Panel>
    </aside>
  );
}
