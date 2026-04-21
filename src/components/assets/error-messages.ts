import { getApiErrorMessage } from "@/components/crud/error-messages";

export function getAssetUiErrorMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error, fallback);
}
