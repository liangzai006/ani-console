import { showMessage } from "@/lib/feedback";

export async function copyToClipboard(text: string, subject = "内容"): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    showMessage({ type: "success", content: `${subject}已复制` });
    return true;
  } catch {
    showMessage({ type: "error", content: `${subject}复制失败，请手动复制` });
    return false;
  }
}
