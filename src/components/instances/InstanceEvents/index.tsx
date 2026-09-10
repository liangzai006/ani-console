import { listInstanceEvents, type InstanceEvent } from "@/api/instances";
import { Empty, Tag } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/common";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatDateTime } from "@/lib/format";

export function InstanceEvents({ instanceId }: { instanceId: string }) {
  const events = useQuery({
    queryKey: ["instance-events", instanceId],
    queryFn: async () => (await listInstanceEvents(instanceId)).items,
  });
  useListErrorNotification({
    id: `instance-events:${instanceId}`,
    title: "事件加载失败",
    error: events.error,
  });

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
            <Tag color={event.type === "Warning" ? "orangered" : "green"}>{event.type}</Tag>
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
