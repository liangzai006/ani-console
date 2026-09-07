import { Descriptions, Empty, Space } from "@arco-design/web-react";
import type { ReactNode } from "react";
import type { components } from "@/api/core-schema";
import {
  DataTable,
  ImageNameText,
  TableSectionHeader,
} from "@/components/common";
import { formatDateTime } from "@/lib/format";
import { getImageDisplayName } from "@/lib/render";

type Instance = components["schemas"]["InstanceRecord"];
type Release = NonNullable<
  NonNullable<Instance["container"]>["history"]
>[number];

export function InstanceReleases({
  instance,
  actions,
}: {
  instance: Instance;
  actions?: ReactNode;
}) {
  const releases = instance.container?.history ?? [];
  const rolloutLabels: Record<string, string> = {
    pending: "待发布",
    progressing: "发布中",
    healthy: "健康",
    degraded: "异常",
    rolled_back: "已回滚",
  };
  const rolloutStatus = instance.container?.rollout_status;

  return (
    <Space direction="vertical" size={16} className="w-full">
      <Descriptions
        column={1}
        labelStyle={{ width: "120px" }}
        data={[
          {
            label: "当前修订",
            value: instance.container?.revision ?? "-",
          },
          {
            label: "发布状态",
            value: rolloutStatus
              ? (rolloutLabels[rolloutStatus] ?? rolloutStatus)
              : "-",
          },
          {
            label: "就绪副本",
            value: instance.container
              ? `${instance.container.ready_replicas} / ${instance.container.replicas}`
              : "-",
          },
          { label: "镜像", value: <ImageNameText image={instance.image} /> },
        ]}
      />
      <TableSectionHeader title="发布历史" extra={actions} className="mb-0" />
      <DataTable<Release>
        data={releases}
        rowKey="revision"
        pagination={false}
        noDataElement={<Empty description="暂无发布历史" />}
        columns={[
          { title: "修订版本", dataIndex: "revision", fixed: "left" },
          {
            title: "镜像",
            ellipsis: true,
            render: (_, release) => getImageDisplayName(release.image),
          },
          {
            title: "发布时间",
            render: (_, release) => formatDateTime(release.created_at),
          },
        ]}
      />
    </Space>
  );
}
