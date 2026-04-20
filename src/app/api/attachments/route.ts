import { NextResponse } from "next/server";

import { withUser } from "@/server/auth/route";
import {
  createAttachment,
  listAttachments,
} from "@/server/domain/attachments";
import { processAttachmentOptimization } from "@/server/domain/attachmentsProcessing";
import { ValidationError } from "@/server/pb/errors";

export const GET = withUser("api/attachments", async (req, session) => {
  const url = new URL(req.url);
  const assetId = url.searchParams.get("assetId");
  if (!assetId) {
    throw new ValidationError("assetId is required");
  }
  const attachments = await listAttachments(session.ctx, assetId);
  return { attachments };
});

export const POST = withUser("api/attachments", async (req, session, user) => {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new ValidationError("Expected multipart/form-data");
  }

  const form = await req.formData();
  const assetId = form.get("assetId");
  const file = form.get("file");
  if (typeof assetId !== "string" || !assetId) {
    throw new ValidationError("assetId is required");
  }
  if (!(file instanceof File)) {
    throw new ValidationError("file is required");
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const { attachmentId } = await createAttachment(session.ctx, {
    assetId,
    fileName: file.name,
    fileType: file.type || null,
    fileBuffer: buffer,
    actorId: user.id,
  });

  // Fire-and-forget optimization. Failures persist to the record for UI display.
  void processAttachmentOptimization(session.ctx, attachmentId).catch(
    (error) => {
      console.error("[api/attachments] optimization error", error);
    },
  );

  return NextResponse.json({ attachmentId }, { status: 201 });
});
