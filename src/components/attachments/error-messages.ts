import { getApiErrorMessage } from "@/components/crud/error-messages";

export function getAttachmentUiErrorMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error, fallback);
}
