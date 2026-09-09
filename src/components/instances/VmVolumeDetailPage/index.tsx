import { Spin } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AliIcon, DetailPageFrame } from "@/components/common";
import { formatDateTime, formatBytes } from "@/lib/format";
import { vmDetailDataSource } from "./data-source";
import { volumeUsageLabel } from "./data-source";
import styles from "./index.module.css";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";

type VmVolumeDetailPageProps = {
  instanceId: string;
  volumeId: string;
};

export function VmVolumeDetailPage({ instanceId, volumeId }: VmVolumeDetailPageProps) {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["vm-volume-detail", instanceId, volumeId],
    queryFn: () => vmDetailDataSource.getVolumeDetail(instanceId, volumeId),
  });
  useListErrorNotification({
    id: `vm-volume-detail:${instanceId}:${volumeId}`,
    title: "云盘详情加载失败",
    error: query.error,
  });

  if (query.isLoading && !query.data) {
    return (
      <div className={styles.state}>
        <Spin />
        <span>正在加载云盘详情...</span>
      </div>
    );
  }

  if (!query.data)
    return (
      <DetailPageFrame
        breadcrumbs={[
          { label: "云主机 VM", to: "/vm-instances" },
          { label: instanceId, to: "/vm-instances/$instanceId", params: { instanceId } },
          { label: volumeId },
        ]}
        title={volumeId}
        icon={<AliIcon name="yunpan" size={28} />}
        headerItems={[
          { label: "云盘 ID", value: volumeId },
          { label: "挂载点", value: "-" },
          { label: "容量", value: "-" },
        ]}
        cards={[
          { key: "basic", title: "云盘信息", fields: [{ label: "云盘 ID", value: volumeId }] },
        ]}
      />
    );

  const volume = query.data;

  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: "云主机 VM", to: "/vm-instances" },
        { label: volume.instanceName, to: "/vm-instances/$instanceId", params: { instanceId } },
        { label: volume.name },
      ]}
      icon={<AliIcon name="yunpan" size={28} />}
      title={volume.name}
      headerItems={[
        { label: "挂载点", value: volume.mountPoint },
        { label: "文件系统", value: volume.filesystem },
        { label: "容量", value: `${formatBytes(volume.sizeBytes)}` },
      ]}
      cards={[
        {
          key: "basic",
          title: "云盘信息",
          fields: [
            { label: "云盘 ID", value: volume.id },
            { label: "所属实例", value: volume.instanceName },
            { label: "设备名", value: volume.device },
            { label: "角色", value: volume.role === "system" ? "系统盘" : "数据盘" },
            { label: "挂载状态", value: volume.status },
            { label: "创建时间", value: formatDateTime(volume.createdAt) },
          ],
        },
        {
          key: "usage",
          title: "容量状态",
          defaultCollapsed: true,
          fields: [
            { label: "已用容量", value: volumeUsageLabel(volume) },
            { label: "使用率", value: `${volume.usedPercent}%` },
            { label: "快照数", value: String(volume.snapshotCount) },
            { label: "加密状态", value: volume.encrypted ? "已加密" : "未加密" },
            { label: "吞吐量", value: volume.throughput },
            { label: "IOPS", value: volume.iops },
          ],
        },
      ]}
      onBack={() => navigate({ to: "/vm-instances/$instanceId", params: { instanceId } })}
    />
  );
}
