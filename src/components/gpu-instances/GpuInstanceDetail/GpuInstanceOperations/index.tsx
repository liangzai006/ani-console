import { Empty } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { DataTable, StatusTag } from "@/components/common";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatDateTime } from "@/lib/format";

type InstanceOperation = components["schemas"]["InstanceOperation"];

const OPERATION_LABELS: Record<string, string> = {
  create: "创建",
  start: "启动",
  stop: "停止",
  restart: "重启",
  scale: "扩缩容",
  update_image: "更新镜像",
  resize: "变配",
  rebuild: "重建",
  delete: "删除",
  snapshot: "快照",
  attach_volume: "挂载云盘",
  detach_volume: "卸载云盘",
  attach_filesystem: "挂载 NFS",
  detach_filesystem: "卸载 NFS",
  bind_secret: "绑定密钥",
  unbind_secret: "解绑密钥",
  change_security_groups: "更换安全组",
  set_termination_protection: "终止保护",
  rollback: "回滚发布",
  console_session: "终端会话",
};

export function GpuInstanceOperations({ instanceId }: { instanceId: string }) {
  const operations = useQuery({
    queryKey: ["gpu-instance-operations", instanceId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET(
        "/instances/{instance_id}/operations",
        {
          params: {
            path: { instance_id: instanceId },
            query: { limit: 100 },
          },
        },
      );
      if (error || !data) {
        throw error ?? new Error("操作历史未返回结果");
      }
      return (data.items ?? []) as InstanceOperation[];
    },
  });
  useListErrorNotification({
    id: `gpu-instance-operations:${instanceId}`,
    title: "操作历史加载失败",
    error: operations.error,
  });
  return (
    <DataTable<InstanceOperation>
      data={operations.data ?? []}
      loading={operations.isLoading}
      pagination={false}
      noDataElement={<Empty description="暂无操作历史" />}
      columns={[
        {
          title: "操作时间",
          width: 180,
          render: (_, operation) => formatDateTime(operation.created_at),
        },
        {
          title: "操作",
          width: 140,
          render: (_, operation) =>
            OPERATION_LABELS[operation.operation] ?? operation.operation,
        },
        {
          title: "状态",
          width: 120,
          render: (_, operation) => <StatusTag status={operation.status} />,
        },
      ]}
    />
  );
}
