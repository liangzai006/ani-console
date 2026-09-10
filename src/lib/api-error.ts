import { Message } from "@arco-design/web-react";
import { getErrorMessage } from "@/lib/errors";

export function showApiError(error: unknown, fallback?: string): void {
  Message.error(getErrorMessage(error, fallback));
}
