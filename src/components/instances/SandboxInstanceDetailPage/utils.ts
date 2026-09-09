import { Message } from "@arco-design/web-react";
import { getErrorMessage } from "@/lib/errors";

export function throwSandboxApiError(error: unknown, status: number, fallback: string): never {
  if (error && typeof error === "object") {
    throw { ...error, status };
  }
  throw { message: fallback, status };
}

export function showSandboxError(error: unknown, fallback: string) {
  Message.error(getErrorMessage(error, fallback));
}

export function formatDurationSeconds(value?: number | null): string {
  if (value == null) return "-";
  if (value <= 0) return "0 秒";
  const days = Math.floor(value / 86_400);
  const hours = Math.floor((value % 86_400) / 3_600);
  const minutes = Math.floor((value % 3_600) / 60);
  const seconds = value % 60;
  return [
    days ? `${days} 天` : "",
    hours ? `${hours} 小时` : "",
    minutes ? `${minutes} 分钟` : "",
    !days && !hours && !minutes ? `${seconds} 秒` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function sandboxStateLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    pending: "等待中",
    running: "运行中",
    paused: "已暂停",
    expired: "已过期",
    stopped: "已停止",
  };
  return value ? (labels[value] ?? value) : "-";
}

export function sandboxEgressLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    deny_all: "拒绝全部",
    allowlist: "仅白名单",
    internet: "允许公网",
  };
  return value ? (labels[value] ?? value) : "-";
}

export function sandboxTimeoutLabel(value?: string | null): string {
  if (value === "pause") return "暂停并保留工作区";
  if (value === "kill") return "销毁实例";
  return value ?? "-";
}

export async function copySandboxText(value: string, success: string) {
  try {
    await navigator.clipboard.writeText(value);
    Message.success(success);
  } catch {
    Message.error("复制失败，请手动复制");
  }
}

export function encodeSandboxText(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
