export type ConvexAppErrorPayload = {
  code?: string
  message?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function getConvexAppErrorPayload(
  error: unknown,
): ConvexAppErrorPayload | null {
  if (!isRecord(error)) {
    return null
  }

  const data = "data" in error ? error.data : undefined
  if (!isRecord(data)) {
    return null
  }

  const code = typeof data.code === "string" ? data.code : undefined
  const message = typeof data.message === "string" ? data.message : undefined

  if (!code && !message) {
    return null
  }

  return { code, message }
}

export function getConvexErrorCode(error: unknown) {
  return getConvexAppErrorPayload(error)?.code ?? null
}

export function getConvexUiMessage(error: unknown, fallback: string) {
  const payloadMessage = getConvexAppErrorPayload(error)?.message
  if (payloadMessage) {
    return payloadMessage
  }

  if (error instanceof Error && error.message) {
    const structuredMatch = error.message.match(/Uncaught ConvexError:\s*(.+)$/m)
    if (structuredMatch?.[1]) {
      return structuredMatch[1].trim()
    }
    if (error.message.includes("Server Error")) {
      return fallback
    }
    return error.message
  }

  return fallback
}
