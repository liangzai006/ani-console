import type { InstanceRecord } from "@/api/instances";
import { Descriptions, Empty, Space, Tag, Tooltip } from "@arco-design/web-react";
import type { ReactNode } from "react";
import { DataTable, ImageNameText, TableSectionHeader } from "@/components/common";
import { formatDateTime } from "@/lib/format";
import { getImageDisplayName } from "@/lib/render";

type Instance = InstanceRecord;
type Release = NonNullable<NonNullable<Instance["container"]>["history"]>[number];

export function InstanceReleases({
  instance,
  actions,
  versionLayout = false,
  onRollback,
  rollbackRevision,
}: {
  instance: Instance;
  actions?: ReactNode;
  versionLayout?: boolean;
  onRollback?: (release: Release) => void | Promise<unknown>;
  rollbackRevision?: string;
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
  const currentRevision = instance.container?.revision;
  const currentRelease = releases.find((release) => release.revision === currentRevision);

  if (versionLayout) {
    return (
      <Space direction="vertical" size={32} className="w-full">
        <section>
          <TableSectionHeader title="当前镜像" extra={actions} className="mb-5" />
          <Descriptions
            column={1}
            labelStyle={{ width: "120px" }}
            data={[
              { label: "镜像", value: <ImageNameText image={instance.image} /> },
              { label: "版本", value: currentRevision ?? "-" },
              {
                label: "更新时间",
                value: formatDateTime(currentRelease?.created_at ?? instance.updated_at),
              },
            ]}
          />
        </section>

        <section>
          <TableSectionHeader title="版本记录" />
          <DataTable<Release>
            data={releases}
            rowKey="revision"
            pagination={false}
            noDataElement={<Empty description="暂无版本记录" />}
            rowActions={
              onRollback
                ? [
                    {
                      key: "rollback",
                      label: "回滚到此版本",
                      disabled: (release) => release.revision === currentRevision,
                      loading: (release) => release.revision === rollbackRevision,
                      tooltip: (release) =>
                        release.revision === currentRevision ? "无法回退到当前版本" : undefined,
                      onClick: onRollback,
                    },
                  ]
                : undefined
            }
            columns={[
              {
                title: "版本",
                dataIndex: "revision",
                fixed: "left",
                width: 240,
                render: (revision) => (
                  <div className="flex min-w-0 items-center gap-2">
                    <Tooltip content={revision}>
                      <span className="block min-w-0 flex-1 truncate whitespace-nowrap">
                        {revision}
                      </span>
                    </Tooltip>
                    {revision === currentRevision ? (
                      <Tag color="arcoblue" className="shrink-0">
                        当前
                      </Tag>
                    ) : null}
                  </div>
                ),
              },
              {
                title: "镜像",
                ellipsis: true,
                render: (_, release) => getImageDisplayName(release.image),
              },
              {
                title: "更新时间",
                render: (_, release) => formatDateTime(release.created_at),
              },
            ]}
          />
        </section>
      </Space>
    );
  }

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
            value: rolloutStatus ? (rolloutLabels[rolloutStatus] ?? rolloutStatus) : "-",
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
