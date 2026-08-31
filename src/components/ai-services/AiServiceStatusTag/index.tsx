import { Tag } from "@arco-design/web-react";

const STATUS_META: Record<
  string,
  { label: string; color: "green" | "orange" | "red" | "blue" | "gray" }
> = {
  available: { label: "可用", color: "green" },
  pending: { label: "等待中", color: "orange" },
  importing: { label: "导入中", color: "blue" },
  failed: { label: "失败", color: "red" },
  running: { label: "运行中", color: "green" },
  deploying: { label: "部署中", color: "blue" },
  stopping: { label: "停止中", color: "orange" },
  stopped: { label: "已停止", color: "gray" },
  error: { label: "异常", color: "red" },
  enabled: { label: "已启用", color: "green" },
  disabled: { label: "已停用", color: "gray" },
};

export function AiServiceStatusTag({
  status,
  raw = false,
}: {
  status: string;
  raw?: boolean;
}) {
  const meta = STATUS_META[status] ?? { label: status, color: "blue" as const };
  return <Tag color={meta.color}>{raw ? status : meta.label}</Tag>;
}
