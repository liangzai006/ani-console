import {
  Alert,
  Card,
  Empty,
  Progress,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "@arco-design/web-react";
import { ApiErrorAlert } from "@/components/common";
import type { GpuSpecAvailabilityListResponse } from "../../types";

export function GpuAdmissionSummary({
  availability,
  loading,
  error,
}: {
  availability?: GpuSpecAvailabilityListResponse;
  loading: boolean;
  error: unknown;
}) {
  const specs = availability?.items ?? [];
  const availableSpecs = specs.filter(
    (item) => item.status === "available" && item.available_count > 0,
  ).length;
  const quotaFullSpecs = specs.filter((item) => item.status === "full").length;
  const deviceFullSpecs = specs.filter(
    (item) => item.status === "device_full",
  ).length;
  const unavailableSpecs = specs.filter(
    (item) => item.status === "unavailable",
  ).length;
  const canCreate =
    availableSpecs > 0 && (availability?.quota_remaining ?? 0) > 0;

  return (
    <Card title="创建准入预检" className="h-full">
      {error ? (
        <ApiErrorAlert error={error} title="GPU 规格可用性加载失败" />
      ) : loading ? (
        <Skeleton animation text={{ rows: 5 }} />
      ) : specs.length === 0 ? (
        <div className="flex h-56 items-center justify-center">
          <Empty description="当前没有 GPU 规格可供预检" />
        </div>
      ) : (
        <Space direction="vertical" size={16} className="w-full">
          <div className="flex items-center gap-5">
            <Progress
              type="circle"
              size="small"
              percent={Math.round((availableSpecs / specs.length) * 100)}
            />
            <div className="min-w-0">
              <Typography.Title heading={5} className="!mb-1 !mt-0">
                {availableSpecs} / {specs.length} 个规格可创建
              </Typography.Title>
              <Typography.Text type="secondary">
                配额余量 {availability?.quota_remaining ?? "-"}
                ，提交创建时仍以实时调度结果为准
              </Typography.Text>
            </div>
          </div>
          <Space wrap>
            <Tag color="green">可用 {availableSpecs}</Tag>
            <Tag color="orange">配额不足 {quotaFullSpecs}</Tag>
            <Tag color="orange">设备不足 {deviceFullSpecs}</Tag>
            <Tag color="red">不可用 {unavailableSpecs}</Tag>
          </Space>
          <Alert
            type={canCreate ? "success" : "warning"}
            showIcon
            content={
              canCreate
                ? "当前存在可用规格，可进入创建流程选择具体规格和调度队列。"
                : "当前没有满足配额与设备条件的规格，创建请求可能被拒绝。"
            }
          />
        </Space>
      )}
    </Card>
  );
}
