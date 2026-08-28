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

  return (
    <Space direction="vertical" size={16} className="w-full">
      <Descriptions
        column={3}
        data={[
          {
            label: "发布状态",
            value: instance.container?.rollout_status ?? "—",
          },
          {
            label: "当前修订版本",
            value: instance.container?.revision ?? "—",
          },
          {
            label: "副本",
            value: instance.container
              ? `${instance.container.ready_replicas} / ${instance.container.replicas}`
              : "—",
          },
        ]}
      />
      <Typography.Title heading={6}>发布历史</Typography.Title>
      <DataTable<Release>
        data={releases}
        rowKey="revision"
        pagination={false}
        noDataElement={<Empty description="暂无发布历史" />}
        columns={[
          { title: "修订版本", dataIndex: "revision" },
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
