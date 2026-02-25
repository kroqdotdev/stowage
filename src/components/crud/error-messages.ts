export function getConvexUiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    if (error.message.includes("Server Error")) {
      return fallback
    }
    return error.message
  }
  return fallback
}
