import { NextResponse } from "next/server";

import { withUser } from "@/server/auth/route";
import {
  createServiceRecordAttachment,
  listServiceRecordAttachments,
} from "@/server/domain/serviceRecordAttachments";
import { ValidationError } from "@/server/pb/errors";

export const GET = withUser("api/service-record-attachments", async (req, session) => {
  const url = new URL(req.url);
  const serviceRecordId = url.searchParams.get("serviceRecordId");
  if (!serviceRecordId) {
    throw new ValidationError("serviceRecordId is required");
  }
  const attachments = await listServiceRecordAttachments(
    session.ctx,
    serviceRecordId,
  );
  return { attachments };
});

export const POST = withUser(
  "api/service-record-attachments",
  async (req, session, user) => {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      throw new ValidationError("Expected multipart/form-data");
    }
    const form = await req.formData();
    const serviceRecordId = form.get("serviceRecordId");
    const file = form.get("file");
    if (typeof serviceRecordId !== "string" || !serviceRecordId) {
      throw new ValidationError("serviceRecordId is required");
    }
    if (!(file instanceof File)) {
      throw new ValidationError("file is required");
    }
    const buffer = new Uint8Array(await file.arrayBuffer());
    const { attachmentId } = await createServiceRecordAttachment(session.ctx, {
      serviceRecordId,
      fileName: file.name,
      fileType: file.type || null,
      fileBuffer: buffer,
      actorId: user.id,
      actorRole: user.role,
    });
    return NextResponse.json({ attachmentId }, { status: 201 });
  },
);
