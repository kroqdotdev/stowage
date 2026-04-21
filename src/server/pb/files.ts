import { NextResponse } from "next/server";

import type { Ctx } from "@/server/pb/context";
import { NotFoundError } from "@/server/pb/errors";

type PbFileSource = {
  url: string;
};

export async function proxyPbFile(
  ctx: Ctx,
  source: PbFileSource,
): Promise<NextResponse> {
  const upstream = await fetch(source.url, {
    headers: {
      Authorization: ctx.pb.authStore.token,
    },
    cache: "no-store",
  });

  if (upstream.status === 404) {
    throw new NotFoundError("File not found");
  }

  if (!upstream.ok || !upstream.body) {
    throw new Error(`PocketBase file fetch failed with ${upstream.status}`);
  }

  const headers = new Headers();
  const headerNames = [
    "content-type",
    "content-length",
    "content-disposition",
    "etag",
    "last-modified",
  ];
  for (const name of headerNames) {
    const value = upstream.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  headers.set("cache-control", "private, no-store");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
