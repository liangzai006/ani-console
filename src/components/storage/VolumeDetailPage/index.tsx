import { applyInstanceLifecycle } from "@/api/instances";
import {
  getVolume,
  listVolumeSnapshots,
  deleteVolume as removeVolume,
  type StorageVolume,
  type StorageVolumeMountHistoryEntry,
  type VolumeSnapshotRecord,
} from "@/api/storage/volumes";
import {
  AliIcon,
  DataTable,
  DetailPageFrame,
  DetailPagePlaceholder,
  ResourceId,
  StatusTag,
  TableSectionHeader,
} from "@/components/common";
import { withId } from "@/lib/id";
import { Button, Dropdown, Empty, Menu, Modal, Tooltip } from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AttachVolumeModal } from "@/components/storage/AttachVolumeModal";
import { CreateVolumeSnapshotModal } from "@/components/storage/CreateVolumeSnapshotModal";
import { ExpandVolumeModal } from "@/components/storage/ExpandVolumeModal";
import { VolumeAutoSnapshotPanel } from "@/components/storage/VolumeAutoSnapshotPanel";
import { VolumeOSInitGuideModal } from "@/components/storage/VolumeOSInitGuideModal";
import { formatBytes, formatDateTime } from "@/lib/format";

type Volume = StorageVolume;
type VolumeSnapshot = VolumeSnapshotRecord;
type MountedInstanceRow = NonNullable<StorageVolume["used_by"]>[number];
type MountHistoryRow = StorageVolumeMountHistoryEntry;

const mountHistoryActionText: Record<MountHistoryRow["action"], string> = {
  mount: "挂载",
  unmount: "卸载",
  create_from_snapshot: "从快照创建",
  os_init: "OS 初始化",
};

export function VolumeDetailPage({ volumeId }: { volumeId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [snapshotVisible, setSnapshotVisible] = useState(false);
  const [attachVisible, setAttachVisible] = useState(false);
  const [expandVisible, setExpandVisible] = useState(false);
  const [initGuideVisible, setInitGuideVisible] = useState(false);
  const detail = useQuery({
    meta: {
      errorNotification: {
        id: withId("volume", volumeId),
        action: "块存储卷加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["volume", volumeId],
    queryFn: () => getVolume(volumeId),
  });
  const snapshots = useQuery({
    meta: {
      errorNotification: {
        id: withId("volume-snapshots", volumeId),
        action: "快照列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["volume-snapshots", volumeId],
    queryFn: () => listVolumeSnapshots(volumeId, { limit: 100 }),
  });
  const deleteVolume = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "volume-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (_: undefined) => removeVolume(volumeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["volumes"] });
      navigate({ to: "/volumes" });
    },
  });
  const detachVolume = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "volume-detach",
        action: "卸载",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (instanceId: string) =>
      applyInstanceLifecycle(instanceId, {
        action: "detach_volume" as const,
        volume_id: volumeId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] });
      qc.invalidateQueries({ queryKey: ["volume", volumeId] });
      qc.invalidateQueries({ queryKey: ["volumes"] });
    },
  });

  if (!detail.data) return <DetailPagePlaceholder loading={detail.isLoading} />;

  const volume = detail.data as Volume;
  const snapshotItems = (snapshots.data?.items ?? []) as VolumeSnapshot[];
  const mountedInstances = volume.used_by ?? [];
  const mountedInstanceNames = mountedInstances
    .map((instance) => instance.instance_name)
    .filter(Boolean)
    .join("、");
  const mounted = mountedInstances.length > 0;
  // const unavailable = (description: string) => <Empty description={description} />;
  const volumeStatus = volume.reason ? (
    <Tooltip content={volume.reason}>
      <span className="inline-flex">
        <StatusTag status={volume.state} />
      </span>
    </Tooltip>
  ) : (
    <StatusTag status={volume.state} />
  );
  const volumeType = (volume.volume_type ?? volume.storage_class).toUpperCase();
  const autoSnapshot = volume.auto_snapshot;
  const autoSnapshotText = autoSnapshot
    ? `${autoSnapshot.enabled ? "开" : "关"} · 保留 ${autoSnapshot.retain_days} 天`
    : "-";
  const osInitStatus = volume.os_init_status === "n_a" ? "n/a" : volume.os_init_status || "-";
  const handleMoreAction = (action: string) => {
    if (action === "expand") {
      setExpandVisible(true);
      return;
    }
    if (action === "os-init") {
      setInitGuideVisible(true);
      return;
    }
    if (action === "delete") {
      Modal.confirm({
        title: "删除块存储卷",
        content: `确定删除「${volume.name}」？卷被实例挂载时无法删除。`,
        okButtonProps: { status: "danger" },
        onOk: () => deleteVolume.mutateAsync(undefined),
      });
    }
  };
  const moreMenu = (
    <Menu onClickMenuItem={handleMoreAction}>
      <Menu.Item key="expand">扩容</Menu.Item>
      <Menu.Item key="os-init">初始化引导</Menu.Item>
      <Menu.Item
        key="delete"
        disabled={deleteVolume.isPending}
        style={{ color: "var(--color-danger-6)" }}
      >
        删除
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "存储" },
          { label: "块存储", to: "/volumes" },
          { label: volume.name },
        ]}
        title={volume.name}
        status={volumeStatus}
        icon={<AliIcon name="kuaicunchu" size={28} />}
        headerItems={[
          { label: "容量 (GiB)", value: String(volume.size_gib) },
          { label: "创建时间", value: formatDateTime(volume.created_at) },
        ]}
        actions={
          <Dropdown trigger="click" position="br" droplist={moreMenu}>
            <Button disabled={deleteVolume.isPending} aria-label="更多操作" title="更多操作">
              <IconMoreVertical />
            </Button>
          </Dropdown>
        }
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [
              { label: "ID", value: <ResourceId value={volume.id} /> },
              {
                label: "容量 / 类型",
                value: `${volume.size_gib}Gi · ${volumeType}`,
              },
              {
                label: "可用区 / IOPS",
                value: `${volume.zone ?? "-"} · ${volume.iops ?? "-"}`,
              },
              { label: "加密", value: volume.encrypted ? "是" : "否" },
              {
                label: "自动快照",
                value: autoSnapshotText,
              },
              {
                label: "来源快照",
                value: volume.from_snapshot_name ?? volume.from_snapshot_id ?? "-",
              },
              {
                label: "挂载实例",
                value: mounted ? mountedInstanceNames : "未挂载",
              },
              { label: "OS 初始化", value: osInitStatus },
              { label: "约束", value: "已挂载不可删 · 扩容不可缩" },
            ],
          },
          {
            key: "related-summary",
            title: "关联摘要",
            fields: mounted
              ? [
                  {
                    label: "实例",
                    value: mountedInstanceNames,
                  },
                ]
              : [{ label: "暂无关联实例", value: "-" }],
          },
        ]}
        tabs={[
          {
            key: "related",
            label: "关联资源",
            content: (
              <div>
                <TableSectionHeader
                  title="关联实例"
                  extra={
                    !mounted ? (
                      <Button onClick={() => setAttachVisible(true)}>挂载</Button>
                    ) : undefined
                  }
                />
                <DataTable<MountedInstanceRow>
                  columns={[
                    { title: "实例名称", dataIndex: "instance_name" },
                    { title: "实例 ID", dataIndex: "instance_id" },
                    {
                      title: "实例类型",
                      dataIndex: "kind",
                      placeholder: "-",
                    },
                    {
                      title: "状态",
                      render: (_, item) => <StatusTag status={item.state} />,
                    },
                  ]}
                  data={mountedInstances}
                  pagination={false}
                  rowActions={[
                    {
                      key: "detach",
                      label: "卸载",
                      intent: "danger",
                      loading: () => detachVolume.isPending,
                      onClick: (item) => {
                        Modal.confirm({
                          title: "卸载块存储卷",
                          content: `确定从实例「${item.instance_name}」卸载该卷？`,
                          okButtonProps: { status: "danger" },
                          onOk: () => detachVolume.mutateAsync(item.instance_id),
                        });
                      },
                    },
                  ]}
                  noDataElement={<Empty description="该卷当前未挂载实例，点击右上角「挂载」开始" />}
                />
              </div>
            ),
          },
          {
            key: "snapshots",
            label: "快照",
            content: (
              <div>
                <TableSectionHeader
                  title="快照"
                  extra={<Button onClick={() => setSnapshotVisible(true)}>创建快照</Button>}
                />
                <DataTable<VolumeSnapshot>
                  columns={[
                    { title: "名称", dataIndex: "name" },
                    {
                      title: "状态",
                      width: 120,
                      render: (_, row) => <StatusTag status={row.status} />,
                    },
                    {
                      title: "大小",
                      render: (_, row) => formatBytes(row.size_bytes),
                    },
                    {
                      title: "创建时间",
                      render: (_, row) => formatDateTime(row.created_at),
                    },
                  ]}
                  data={snapshotItems}
                  loading={snapshots.isLoading}
                  pagination={false}
                  noDataElement={<Empty description="暂无快照，点击右上角「创建快照」开始" />}
                />
              </div>
            ),
          },
          {
            key: "auto-snapshot",
            label: "自动快照",
            content: autoSnapshot ? (
              <VolumeAutoSnapshotPanel volumeId={volumeId} policy={autoSnapshot} />
            ) : (
              <Empty description="暂无自动快照策略" />
            ),
          },
          {
            key: "mount-history",
            label: "挂载历史",
            content: (
              <DataTable<MountHistoryRow>
                columns={[
                  {
                    title: "时间",
                    render: (_, item) => formatDateTime(item.at),
                  },
                  {
                    title: "操作",
                    render: (_, item) => mountHistoryActionText[item.action],
                  },
                  { title: "目标", dataIndex: "target", placeholder: "-" },
                  {
                    title: "结果",
                    render: (_, item) => <StatusTag status={item.result} />,
                  },
                ]}
                data={volume.mount_history ?? []}
                pagination={false}
                noDataElement={<Empty description="暂无挂载历史" />}
              />
            ),
          },
          /* 当前 Core API 未提供块存储事件列表接口，保留代码待接口开放后恢复。
          {
            key: "events",
            label: "事件",
            content: (
              <Space direction="vertical" size={12} className="w-full">
                {unavailable("当前 Core API 暂未提供块存储事件列表")}
              </Space>
            ),
          },
          */
        ]}
        onBack={() => navigate({ to: "/volumes" })}
      />
      <CreateVolumeSnapshotModal
        visible={snapshotVisible}
        volumeId={volumeId}
        onCancel={() => setSnapshotVisible(false)}
      />
      <AttachVolumeModal
        visible={attachVisible}
        volumeId={volumeId}
        onCancel={() => setAttachVisible(false)}
      />
      <ExpandVolumeModal
        visible={expandVisible}
        volume={volume}
        onCancel={() => setExpandVisible(false)}
      />
      <VolumeOSInitGuideModal
        visible={initGuideVisible}
        volumeId={volumeId}
        onCancel={() => setInitGuideVisible(false)}
      />
    </>
  );
}
