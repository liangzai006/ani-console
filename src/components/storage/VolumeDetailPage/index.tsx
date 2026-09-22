import { getVolume, deleteVolume as removeVolume, type StorageVolume } from "@/api/storage/volumes";
import {
  AliIcon,
  DetailPageFrame,
  DetailPagePlaceholder,
  ResourceId,
  StatusTag,
} from "@/components/common";
import { withId } from "@/lib/id";
import { Button, Dropdown, Menu, Modal, Tooltip } from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { ExpandVolumeModal } from "@/components/storage/ExpandVolumeModal";
import { navigationBreadcrumbsForPath } from "@/components/layouts/AppLayout/navigation";
import { VolumeOSInitGuideModal } from "@/components/storage/VolumeOSInitGuideModal";
import { formatDateTime } from "@/lib/format";
import { VolumeAutoSnapshot } from "@/components/storage/VolumeAutoSnapshot";
import { VolumeMountHistory } from "./VolumeMountHistory";
import { VolumeRelatedResources } from "./VolumeRelatedResources";
import { VolumeSnapshots } from "./VolumeSnapshots";

type Volume = StorageVolume;

export function VolumeDetailPage({ volumeId }: { volumeId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
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
  if (!detail.data) return <DetailPagePlaceholder loading={detail.isLoading} />;

  const volume = detail.data as Volume;
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
        breadcrumbs={[...navigationBreadcrumbsForPath("/volumes"), { label: volume.name }]}
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
            content: <VolumeRelatedResources volume={volume} />,
          },
          {
            key: "snapshots",
            label: "快照",
            content: <VolumeSnapshots volumeId={volumeId} />,
          },
          {
            key: "auto-snapshot",
            label: "自动快照",
            content: <VolumeAutoSnapshot volumeId={volumeId} policy={autoSnapshot} />,
          },
          {
            key: "mount-history",
            label: "挂载历史",
            content: <VolumeMountHistory items={volume.mount_history ?? []} />,
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
      {expandVisible && (
        <ExpandVolumeModal volume={volume} onCancel={() => setExpandVisible(false)} />
      )}
      {initGuideVisible && (
        <VolumeOSInitGuideModal volumeId={volumeId} onCancel={() => setInitGuideVisible(false)} />
      )}
    </>
  );
}
