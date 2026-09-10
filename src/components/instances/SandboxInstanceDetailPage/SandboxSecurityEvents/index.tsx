import { listInstanceSecurityEvents, type InstanceSecurityEvent } from "@/api/instances";
import { Empty, Select, Space, Tag, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "@/components/common";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatDateTime } from "@/lib/format";

type SecurityEvent = InstanceSecurityEvent;
type Severity = "all" | "info" | "warning" | "critical";

export function SandboxSecurityEvents({ instanceId }: { instanceId: string }) {
  const [severity, setSeverity] = useState<Severity>("all");
  const query = useQuery({
    queryKey: ["sandbox-security-events", instanceId, severity],
    queryFn: async () =>
      (
        await listInstanceSecurityEvents(instanceId, {
          limit: 100,
          severity: severity === "all" ? undefined : severity,
        })
      ).items,
  });
  useListErrorNotification({
    id: `sandbox-security:${instanceId}:${severity}`,
    title: "安全事件加载失败",
    error: query.error,
  });

  return (
    <Space direction="vertical" size={24} className="w-full">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Typography.Title heading={6}>安全事件</Typography.Title>
          <Space>
            <span className="text-(--color-text-2)">级别</span>
            <Select
              className="w-40"
              value={severity}
              onChange={setSeverity}
              options={[
                { label: "全部", value: "all" },
                { label: "信息", value: "info" },
                { label: "警告", value: "warning" },
                { label: "严重", value: "critical" },
              ]}
            />
          </Space>
        </div>
        <DataTable<SecurityEvent>
          data={query.data ?? []}
          loading={query.isLoading || query.isFetching}
          pagination={false}
          noDataElement={<Empty description="暂无安全事件" />}
          columns={[
            {
              title: "级别",
              width: 100,
              render: (_, item) => <Tag color={severityColor(item.severity)}>{item.severity}</Tag>,
            },
            { title: "类型", dataIndex: "event_type", width: 180 },
            { title: "说明", dataIndex: "message" },
            {
              title: "发生时间",
              width: 180,
              render: (_, item) => formatDateTime(item.occurred_at),
            },
          ]}
        />
      </section>
    </Space>
  );
}

function severityColor(severity: string) {
  if (severity === "critical") return "red";
  if (severity === "warning") return "orange";
  return "blue";
}
