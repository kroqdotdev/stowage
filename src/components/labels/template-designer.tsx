"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import type { FieldDefinition } from "@/components/fields/types";
import { ElementProperties } from "@/components/labels/element-properties";
import { ElementToolbar } from "@/components/labels/element-toolbar";
import {
  clamp,
  cloneEditableLabelTemplate,
  createEmptyLabelTemplate,
  createLabelElementDraft,
  formatLabelDimensions,
  hasTemplateChanged,
  roundMm,
} from "@/components/labels/helpers";
import { LabelPreview } from "@/components/labels/label-preview";
import { TemplateCanvas } from "@/components/labels/template-canvas";
import type {
  EditableLabelTemplate,
  LabelElementType,
  LabelPreviewAsset,
  LabelTemplate,
  LabelTemplateElement,
} from "@/components/labels/types";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { SheetHeading } from "@/components/ui/sheet-heading";
import {
  createLabelTemplate,
  deleteLabelTemplate,
  updateLabelTemplate,
} from "@/lib/api/label-templates";
import { cn } from "@/lib/utils";

function sanitizeElement(
  element: LabelTemplateElement,
  template: Pick<EditableLabelTemplate, "widthMm" | "heightMm">,
): LabelTemplateElement {
  const widthMm = clamp(roundMm(element.widthMm), 1, template.widthMm);
  const heightMm = clamp(roundMm(element.heightMm), 1, template.heightMm);
  return {
    ...element,
    xMm: clamp(
      roundMm(element.xMm),
      0,
      Math.max(template.widthMm - widthMm, 0),
    ),
    yMm: clamp(
      roundMm(element.yMm),
      0,
      Math.max(template.heightMm - heightMm, 0),
    ),
    widthMm,
    heightMm,
    fontSize:
      element.fontSize === undefined
        ? undefined
        : clamp(roundMm(element.fontSize), 1, 72),
  };
}

function sanitizeTemplate(
  template: EditableLabelTemplate,
): EditableLabelTemplate {
  const widthMm = clamp(roundMm(template.widthMm), 1, 200);
  const heightMm = clamp(roundMm(template.heightMm), 1, 200);
  const normalized = {
    ...template,
    widthMm,
    heightMm,
  };

  return {
    ...normalized,
    elements: normalized.elements.map((element) =>
      sanitizeElement(element, normalized),
    ),
  };
}

function loadTemplateDraft(template: LabelTemplate) {
  const editable = cloneEditableLabelTemplate(template);
  return {
    draft: editable,
    baseline: cloneEditableLabelTemplate(template),
    selectedElementId: template.elements[0]?.id ?? null,
  };
}

export function TemplateDesigner({
  currentUserRole,
  templates,
  labelUrlBase,
  sampleAsset,
  fieldDefinitions,
}: {
  currentUserRole: "admin" | "user" | null;
  templates: LabelTemplate[];
  labelUrlBase: string | null;
  sampleAsset: LabelPreviewAsset | null;
  fieldDefinitions: FieldDefinition[];
}) {
  const canManage = currentUserRole === "admin";
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (input: {
      name: string;
      widthMm: number;
      heightMm: number;
      elements: LabelTemplateElement[];
      isDefault: boolean;
    }) => createLabelTemplate(input),
  });
  const updateMutation = useMutation({
    mutationFn: ({
      templateId,
      input,
    }: {
      templateId: string;
      input: {
        name: string;
        widthMm: number;
        heightMm: number;
        elements: LabelTemplateElement[];
        isDefault: boolean;
      };
    }) => updateLabelTemplate(templateId, input),
  });
  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => deleteLabelTemplate(templateId),
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<
    string | "new" | null
  >(null);
  const [draft, setDraft] = useState<EditableLabelTemplate | null>(null);
  const [baseline, setBaseline] = useState<EditableLabelTemplate | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (selectedTemplateId === "new") {
      return;
    }

    if (templates.length === 0) {
      if (draft === null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(createEmptyLabelTemplate());
      }
      return;
    }

    if (selectedTemplateId === null) {
      const next = loadTemplateDraft(templates[0]!);
      setSelectedTemplateId(templates[0]!.id);
      setDraft(next.draft);
      setBaseline(next.baseline);
      setSelectedElementId(next.selectedElementId);
      return;
    }

    const selected = templates.find(
      (template) => template.id === selectedTemplateId,
    );
    if (!selected) {
      const fallback = loadTemplateDraft(templates[0]!);
      setSelectedTemplateId(templates[0]!.id);
      setDraft(fallback.draft);
      setBaseline(fallback.baseline);
      setSelectedElementId(fallback.selectedElementId);
      return;
    }

    if (draft === null || draft.id !== selected.id) {
      const next = loadTemplateDraft(selected);
      setDraft(next.draft);
      setBaseline(next.baseline);
      setSelectedElementId(next.selectedElementId);
    }
  }, [draft, selectedTemplateId, templates]);

  const dirty = draft ? hasTemplateChanged(draft, baseline) : false;
  const activeTemplate = draft ?? createEmptyLabelTemplate();
  const selectedElement = useMemo(
    () =>
      activeTemplate.elements.find(
        (element) => element.id === selectedElementId,
      ) ?? null,
    [activeTemplate.elements, selectedElementId],
  );

  function applyDraft(nextTemplate: EditableLabelTemplate) {
    setDraft(sanitizeTemplate(nextTemplate));
  }

  function updateSelectedTemplate(template: LabelTemplate) {
    const next = loadTemplateDraft(template);
    setSelectedTemplateId(template.id);
    setDraft(next.draft);
    setBaseline(next.baseline);
    setSelectedElementId(next.selectedElementId);
  }

  function confirmDiscardChanges() {
    if (!dirty) {
      return true;
    }

    return window.confirm("Discard unsaved label template changes?");
  }

  function handleSelectTemplate(template: LabelTemplate) {
    if (!confirmDiscardChanges()) {
      return;
    }
    updateSelectedTemplate(template);
  }

  function handleCreateTemplate() {
    if (!confirmDiscardChanges()) {
      return;
    }

    setSelectedTemplateId("new");
    setDraft(createEmptyLabelTemplate());
    setBaseline(null);
    setSelectedElementId(null);
  }

  function handleAddElement(type: LabelElementType) {
    if (!canManage || !draft) {
      return;
    }

    if (type === "customField" && fieldDefinitions.length === 0) {
      toast.error("Create a custom field before adding it to a label.");
      return;
    }

    const element = createLabelElementDraft({
      type,
      index: draft.elements.length,
      template: draft,
      fieldId: fieldDefinitions[0]?.id ?? null,
    });

    applyDraft({
      ...draft,
      elements: [...draft.elements, element],
    });
    setSelectedElementId(element.id);
  }

  const handleChangeElement = useCallback(
    (
      elementId: string,
      updater: (element: LabelTemplateElement) => LabelTemplateElement,
    ) => {
      setDraft((prev) => {
        if (!prev) {
          return prev;
        }

        return sanitizeTemplate({
          ...prev,
          elements: prev.elements.map((element) =>
            element.id === elementId ? updater(element) : element,
          ),
        });
      });
    },
    [],
  );

  function handleDeleteElement(elementId: string) {
    if (!draft) {
      return;
    }

    const nextElements = draft.elements.filter(
      (element) => element.id !== elementId,
    );
    applyDraft({
      ...draft,
      elements: nextElements,
    });
    setSelectedElementId(nextElements[0]?.id ?? null);
  }

  async function handleSave() {
    if (!canManage || !draft) {
      return;
    }

    if (draft.name.trim() === "") {
      toast.error("Template name is required.");
      return;
    }

    try {
      if (draft.id) {
        await updateMutation.mutateAsync({
          templateId: draft.id,
          input: {
            name: draft.name,
            widthMm: draft.widthMm,
            heightMm: draft.heightMm,
            elements: draft.elements,
            isDefault: draft.isDefault,
          },
        });
        setBaseline(cloneEditableLabelTemplate(draft));
        toast.success("Label template updated");
      } else {
        const created = await createMutation.mutateAsync({
          name: draft.name,
          widthMm: draft.widthMm,
          heightMm: draft.heightMm,
          elements: draft.elements,
          isDefault: draft.isDefault,
        });
        const saved = { ...draft, id: created.id };
        setSelectedTemplateId(created.id);
        setDraft(saved);
        setBaseline(cloneEditableLabelTemplate(saved));
        toast.success("Label template created");
      }
      void queryClient.invalidateQueries({ queryKey: ["label-templates"] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to save label template"));
    }
  }

  async function handleDeleteTemplate() {
    if (!canManage || !draft?.id) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(draft.id);
      toast.success("Label template deleted");
      setDeleteOpen(false);
      setSelectedTemplateId(null);
      setDraft(null);
      setBaseline(null);
      setSelectedElementId(null);
      void queryClient.invalidateQueries({ queryKey: ["label-templates"] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete label template"));
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  const deleting = deleteMutation.isPending;

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-7">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="label-templates-title">
            <h2 id="label-templates-title" className="sr-only">
              Templates
            </h2>
            {templates.length === 0 ? (
              <div className="flex items-center justify-between gap-3 border-b border-border pb-2.5">
                <p className="text-sm text-ink-2">No label templates yet.</p>
                {canManage ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCreateTemplate}
                  >
                    <Plus />
                    New template
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="flex items-stretch gap-3 border-b border-border">
                <ul
                  className="-mb-px flex min-w-0 flex-1 items-stretch gap-0.5 overflow-x-auto"
                  aria-label="Label templates"
                >
                  {templates.map((template) => {
                    const active = activeTemplate.id === template.id;
                    return (
                      <li
                        key={template.id}
                        className="flex shrink-0 first:[&>button]:pl-0.5"
                      >
                        <button
                          type="button"
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "flex shrink-0 cursor-pointer flex-col items-start border-b-[3px] px-3 pt-1 pb-2 text-left transition-colors",
                            active
                              ? "border-amber-ink text-foreground"
                              : "border-transparent text-ink-2 hover:text-foreground",
                          )}
                          onClick={() => handleSelectTemplate(template)}
                        >
                          <span
                            className={cn(
                              "text-sm whitespace-nowrap",
                              active ? "font-semibold" : "font-medium",
                            )}
                          >
                            {template.name}
                          </span>
                          <span className="text-[13px] whitespace-nowrap text-muted-foreground">
                            <span className="font-mono font-medium">
                              {formatLabelDimensions(
                                template.widthMm,
                                template.heightMm,
                              )}
                            </span>
                            {template.isDefault ? (
                              <span> · Default</span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {selectedTemplateId === "new" ? (
                    <li
                      aria-current="true"
                      className="flex shrink-0 flex-col items-start border-b-[3px] border-amber-ink px-3 pt-1 pb-2"
                    >
                      <span className="text-sm font-semibold whitespace-nowrap text-foreground">
                        {activeTemplate.name.trim() || "New template"}
                      </span>
                      <span className="text-[13px] whitespace-nowrap text-muted-foreground">
                        Not saved yet
                      </span>
                    </li>
                  ) : null}
                </ul>
                {canManage ? (
                  <div className="flex shrink-0 items-center pb-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCreateTemplate}
                    >
                      <Plus />
                      New template
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <Panel className="overflow-hidden">
            <TemplateCanvas
              template={activeTemplate}
              sampleAsset={sampleAsset}
              fieldDefinitions={fieldDefinitions}
              origin={labelUrlBase ?? undefined}
              selectedElementId={selectedElementId}
              readOnly={!canManage}
              onSelectElement={setSelectedElementId}
              onDeleteElement={handleDeleteElement}
              onChangeElement={handleChangeElement}
            />
            <ElementToolbar
              canEdit={canManage}
              canAddCustomField={fieldDefinitions.length > 0}
              onAddElement={handleAddElement}
            />
          </Panel>

          <section aria-labelledby="label-preview-title">
            <SheetHeading
              title={<span id="label-preview-title">Preview</span>}
              as="h3"
            />
            <p className="px-0.5 pt-1.5 text-[13px] text-muted-foreground">
              {sampleAsset
                ? `Close to printed size, with ${sampleAsset.name}. Print preview uses the same renderer.`
                : "No assets yet. Placeholder values are shown until an asset exists."}
            </p>
            <div className="mt-3 overflow-x-auto rounded-md bg-secondary p-5">
              <div className="mx-auto w-max">
                <LabelPreview
                  template={activeTemplate}
                  asset={sampleAsset}
                  fieldDefinitions={fieldDefinitions}
                  origin={labelUrlBase ?? undefined}
                  scale={1}
                  surfaceClassName="border-line-2 shadow-none"
                />
              </div>
            </div>
          </section>
        </div>

        <ElementProperties
          template={activeTemplate}
          selectedElement={selectedElement}
          fieldDefinitions={fieldDefinitions}
          canEdit={canManage}
          dirty={dirty}
          saving={saving}
          deleting={deleting}
          onTemplateChange={(updater) => applyDraft(updater(activeTemplate))}
          onSelectPreset={(widthMm, heightMm) =>
            applyDraft({
              ...activeTemplate,
              widthMm,
              heightMm,
            })
          }
          onChangeElement={handleChangeElement}
          onDeleteElement={handleDeleteElement}
          onCreateTemplate={handleCreateTemplate}
          onDeleteTemplate={() => setDeleteOpen(true)}
          onSave={handleSave}
        />
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete label template?"
        description={`${activeTemplate.name || "This template"} is deleted. Printed labels are not affected.`}
        confirmLabel="Delete template"
        busy={deleting}
        onConfirm={() => {
          void handleDeleteTemplate();
        }}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
          }
        }}
      />
    </>
  );
}
