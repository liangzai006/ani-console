import { Descriptions, Empty, Space, Typography } from "@arco-design/web-react";
import type { components } from "@/api/core-schema";
import { DataTable } from "@/components/common";
import { formatDateTime } from "@/lib/format";

type Instance = components["schemas"]["InstanceRecord"];
type Release = NonNullable<
  NonNullable<Instance["container"]>["history"]
>[number];

export function GpuInstanceReleases({ instance }: { instance: Instance }) {
  const releases = instance.container?.history ?? [];
  const rolloutLabels: Record<string, string> = {
    pending: "待发布",
    progressing: "发布中",
    healthy: "健康",
    degraded: "异常",
    rolled_back: "已回滚",
  };
  const rolloutStatus = instance.container?.rollout_status;
  const image =
    instance.image?.ref ??
    instance.image?.name ??
    instance.image?.id ??
    "—";

  return (
    <Space direction="vertical" size={16} className="w-full">
      <Descriptions
        column={1}
        labelStyle={{ width: '120px' }}
        data={[
          {
            label: "当前修订",
            value: instance.container?.revision ?? "—",
          },
          {
            label: "发布状态",
            value: rolloutStatus
              ? (rolloutLabels[rolloutStatus] ?? rolloutStatus)
              : "—",
          },
          {
            label: "就绪副本",
            value: instance.container
              ? `${instance.container.ready_replicas} / ${instance.container.replicas}`
              : "—",
          },
          { label: "镜像", value: image },
        ]}
      />
      <Typography.Title heading={6}>发布历史</Typography.Title>
      <DataTable<Release>
        data={releases}
        rowKey="revision"
        pagination={false}
        noDataElement={<Empty description="暂无发布历史" />}
        columns={[
          { title: "修订版本", dataIndex: "revision", fixed: "left" },
          { title: "镜像", render: (_, release) => release.image ?? "—" },
          {
            title: "发布时间",
            render: (_, release) => formatDateTime(release.created_at),
          },
        ]}
      />
    </Space>
  );
}
