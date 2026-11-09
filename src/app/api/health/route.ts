export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
  });
}
