import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createCategory,
  listCategories,
  CreateCategoryInput,
} from "@/server/domain/categories";
import { createAdminCtx } from "@/server/pb/context";
import { DomainError } from "@/server/pb/errors";

export async function GET() {
  try {
    const ctx = await createAdminCtx();
    const categories = await listCategories(ctx);
    return NextResponse.json({ categories });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const input = CreateCategoryInput.parse(body);
    const ctx = await createAdminCtx();
    const category = await createCategory(ctx, input);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid request", issues: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[api/categories] unexpected error", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}
