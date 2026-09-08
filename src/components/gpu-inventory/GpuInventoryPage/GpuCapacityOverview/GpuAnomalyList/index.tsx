import {
  Card,
  Empty,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "@arco-design/web-react";
import type { components } from "@/api/core-schema";
import { ApiErrorAlert } from "@/components/common";

type GpuInventoryRecord = components["schemas"]["GPUInventoryRecord"];

const statusLabel: Record<GpuInventoryRecord["status"], string> = {
  available: "空闲",
  in_use: "占用中",
  fault: "故障",
  maintenance: "维护",
};

export function GpuAnomalyList({
  items,
  loading,
  error,
}: {
  items?: GpuInventoryRecord[];
  loading: boolean;
  error: unknown;
}) {
  const anomalies = items ?? [];

  return (
    <Card
      title="异常"
      className="h-full"
      extra={
        <Typography.Text type="secondary">
          {anomalies.length} 项
        </Typography.Text>
      }
    >
      {error ? (
        <ApiErrorAlert error={error} title="GPU 异常数据加载失败" />
      ) : loading ? (
        <Skeleton animation text={{ rows: 4 }} />
      ) : anomalies.length === 0 ? (
        <div className="flex h-52 items-center justify-center">
          <Empty description="当前无 GPU 异常" />
        </div>
      ) : (
        <Space direction="vertical" size={10} className="w-full">
          {anomalies.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded bg-fill-2 px-4 py-3"
            >
              <Space size={8}>
                <Tag color={item.status === "fault" ? "red" : "orange"}>
                  {statusLabel[item.status]}
                </Tag>
                <Typography.Text>{item.gpu_type}</Typography.Text>
              </Space>
              <Typography.Text type="secondary">
                {item.node_name}
              </Typography.Text>
            </div>
          ))}
        </Space>
      )}
    </Card>
  );
}
