import { getConvexUiMessage } from "@/lib/convex-errors"

export function getConvexUiErrorMessage(error: unknown, fallback: string) {
  return getConvexUiMessage(error, fallback)
}
