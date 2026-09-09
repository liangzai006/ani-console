import { Tag } from "@arco-design/web-react";

const STATUS_COLOR: Record<string, "green" | "orange" | "red" | "blue" | "gray" | "arcoblue"> = {
  running: "green",
  ready: "green",
  active: "green",
  available: "green",
  succeeded: "green",
  success: "green",
  pending: "orange",
  provisioning: "arcoblue",
  starting: "arcoblue",
  stopping: "orange",
  deploying: "arcoblue",
  warning: "orange",
  degraded: "orange",
  failed: "red",
  error: "red",
  deleted: "gray",
  deleting: "red",
  stopped: "gray",
  accepted: "arcoblue",
  in_progress: "arcoblue",
  cancelled: "gray",
};

export function StatusTag({ status }: { status?: string | null }) {
  if (!status) return <Tag>-</Tag>;
  const color = STATUS_COLOR[status.toLowerCase()] ?? "blue";
  return <Tag color={color}>{status}</Tag>;
}
