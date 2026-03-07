"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getConvexUiErrorMessage } from "@/components/crud/error-messages";
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
import { api } from "@/lib/convex-api";
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
  const createTemplate = useMutation(api.labelTemplates.createTemplate);
  const updateTemplate = useMutation(api.labelTemplates.updateTemplate);
  const deleteTemplate = useMutation(api.labelTemplates.deleteTemplate);

  const [selectedTemplateId, setSelectedTemplateId] = useState<
    LabelTemplate["_id"] | "new" | null
  >(null);
  const [draft, setDraft] = useState<EditableLabelTemplate | null>(null);
  const [baseline, setBaseline] = useState<EditableLabelTemplate | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Intentional sync effect for the template editing workflow: keeps draft,
  // baseline, and selectedElementId in sync when the reactive `templates`
  // array changes (e.g. after save/delete) or when no template is selected.
  useEffect(() => {
    if (selectedTemplateId === "new") {
      return;
    }

    if (templates.length === 0) {
      if (draft === null) {
        setDraft(createEmptyLabelTemplate());
      }
      return;
    }

    if (selectedTemplateId === null) {
      const next = loadTemplateDraft(templates[0]!);
      setSelectedTemplateId(templates[0]!._id);
      setDraft(next.draft);
      setBaseline(next.baseline);
      setSelectedElementId(next.selectedElementId);
      return;
    }

    const selected = templates.find(
      (template) => template._id === selectedTemplateId,
    );
    if (!selected) {
      const fallback = loadTemplateDraft(templates[0]!);
      setSelectedTemplateId(templates[0]!._id);
      setDraft(fallback.draft);
      setBaseline(fallback.baseline);
      setSelectedElementId(fallback.selectedElementId);
      return;
    }

    if (draft === null || draft._id !== selected._id) {
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
    setSelectedTemplateId(template._id);
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
      fieldId: fieldDefinitions[0]?._id ?? null,
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

    setSaving(true);
    try {
      if (draft._id) {
        await updateTemplate({
          templateId: draft._id,
          name: draft.name,
          widthMm: draft.widthMm,
          heightMm: draft.heightMm,
          elements: draft.elements,
          isDefault: draft.isDefault,
        });
        setBaseline(cloneEditableLabelTemplate(draft));
        toast.success("Label template updated");
      } else {
        const result = await createTemplate({
          name: draft.name,
          widthMm: draft.widthMm,
          heightMm: draft.heightMm,
          elements: draft.elements,
          isDefault: draft.isDefault,
        });
        const saved = { ...draft, _id: result.templateId };
        setSelectedTemplateId(result.templateId);
        setDraft(saved);
        setBaseline(cloneEditableLabelTemplate(saved));
        toast.success("Label template created");
      }
    } catch (error) {
      toast.error(
        getConvexUiErrorMessage(error, "Unable to save label template"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!canManage || !draft?._id) {
      return;
    }

    setDeleting(true);
    try {
      await deleteTemplate({ templateId: draft._id });
      toast.success("Label template deleted");
      setDeleteOpen(false);
      setSelectedTemplateId(null);
      setDraft(null);
      setBaseline(null);
      setSelectedElementId(null);
    } catch (error) {
      toast.error(
        getConvexUiErrorMessage(error, "Unable to delete label template"),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">
                  Templates
                </h2>
                <p className="text-xs text-muted-foreground">
                  Pick a saved layout or create a new one.
                </p>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleCreateTemplate}
                >
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              ) : null}
            </div>

            {templates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-background/60 px-4 py-6 text-sm text-muted-foreground">
                No label templates yet.
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => {
                  const active = activeTemplate._id === template._id;
                  return (
                    <button
                      key={template._id}
                      type="button"
                      className={cn(
                        "flex w-full cursor-pointer items-start justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                        active
                          ? "border-slate-600 bg-slate-100 shadow-sm dark:bg-slate-900"
                          : "border-border/70 bg-background/80 hover:border-slate-400 hover:bg-accent/50",
                      )}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {template.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formatLabelDimensions(
                            template.widthMm,
                            template.heightMm,
                          )}
                        </span>
                      </span>
                      {template.isDefault ? (
                        <span className="rounded-full border border-emerald-300/70 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Default
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <ElementToolbar
            canEdit={canManage}
            canAddCustomField={fieldDefinitions.length > 0}
            onAddElement={handleAddElement}
          />
        </div>

        <div className="space-y-4">
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

          <section className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">
                  Live preview
                </h3>
                <p className="text-xs text-muted-foreground">
                  Real asset data rendered with the current template.
                </p>
              </div>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="mx-auto w-max">
                <LabelPreview
                  template={activeTemplate}
                  asset={sampleAsset}
                  fieldDefinitions={fieldDefinitions}
                  origin={labelUrlBase ?? undefined}
                  scale={2.35}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {sampleAsset
                ? `Previewing with ${sampleAsset.name}. Print preview uses the same renderer.`
                : "No assets yet. Placeholder values are shown until an asset exists."}
            </p>
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
        title="Delete label template"
        description={`Delete ${activeTemplate.name || "this template"}?`}
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
