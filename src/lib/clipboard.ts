import copy from "copy-to-clipboard";

import { showMessage } from "@/lib/feedback";

export async function copyToClipboard(text: string, subject = "内容"): Promise<boolean> {
  try {
    const copied = await copy(text);
    showMessage({
      type: copied ? "success" : "error",
      content: copied ? `${subject}已复制` : `${subject}复制失败，请手动复制`,
    });
    return copied;
  } catch {
    showMessage({ type: "error", content: `${subject}复制失败，请手动复制` });
    return false;
  }
}
