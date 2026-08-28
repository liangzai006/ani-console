import { Empty, Tag } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import {
  ApiErrorAlert,
  DataTable,
} from "@/components/common";
import { formatDateTime } from "@/lib/format";

type InstanceEvent = components["schemas"]["InstanceEvent"];

export function GpuInstanceEvents({ instanceId }: { instanceId: string }) {
  const events = useQuery({
    queryKey: ["gpu-instance-events", instanceId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET(
        "/instances/{instance_id}/events",
        {
          params: {
            path: { instance_id: instanceId },
            query: { limit: 100 },
          },
        },
      );
      if (error || !data) throw error ?? new Error("事件列表未返回结果");
      return data.items as InstanceEvent[];
    },
    refetchInterval: 10000,
  });

  if (events.error) return <ApiErrorAlert error={events.error} />;

  return (
    <DataTable<InstanceEvent>
      data={events.data ?? []}
      loading={events.isLoading}
      pagination={false}
      noDataElement={<Empty description="暂无事件" />}
      columns={[
        {
          title: "类型",
          width: 100,
          render: (_, event) => (
            <Tag color={event.type === "Warning" ? "orangered" : "green"}>
              {event.type}
            </Tag>
          ),
        },
        { title: "原因", dataIndex: "reason", width: 180 },
        { title: "消息", dataIndex: "message" },
        { title: "次数", dataIndex: "count", width: 80 },
        {
          title: "发生时间",
          width: 180,
          render: (_, event) => formatDateTime(event.occurred_at),
        },
      ]}
    />
  );
}
