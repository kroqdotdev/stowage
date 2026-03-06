"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { CrudModal } from "@/components/crud/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ServiceGroupEditorInitialValue = {
  _id: string;
  name: string;
  description: string | null;
};

export function ServiceGroupEditor({
  open,
  mode,
  initialGroup,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  initialGroup: ServiceGroupEditorInitialValue | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; description: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initialGroup?.name ?? "");
  const [description, setDescription] = useState(initialGroup?.description ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ name, description });
  }

  return (
    <CrudModal
      open={open}
      onClose={() => {
        if (!submitting) {
          onClose();
        }
      }}
      title={mode === "create" ? "Create service group" : "Edit service group"}
      description="Define reusable service requirements for assets."
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
            form="service-group-editor-form"
            className="cursor-pointer"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? "Create group" : "Save changes"}
          </Button>
        </>
      }
    >
      <form
        id="service-group-editor-form"
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <div className="space-y-1.5">
          <label htmlFor="service-group-name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="service-group-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Quarterly electrical checks"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="service-group-description"
            className="text-sm font-medium"
          >
            Description
          </label>
          <Textarea
            id="service-group-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional notes for the service group."
            className="min-h-24"
          />
        </div>
      </form>
    </CrudModal>
  );
}
