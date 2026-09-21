import { applyInstanceLifecycle } from "@/api/instances";
import type { StorageVolume } from "@/api/storage/volumes";
import { DataTable, StatusTag, TableSectionHeader } from "@/components/common";
import { AttachVolumeModal } from "@/components/storage/AttachVolumeModal";
import { Button, Empty, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type MountedInstance = NonNullable<StorageVolume["used_by"]>[number];

export function VolumeRelatedResources({ volume }: { volume: StorageVolume }) {
  const qc = useQueryClient();
  const [attachVisible, setAttachVisible] = useState(false);
  const detach = useMutation({
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
        volume_id: volume.id,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["instances"] });
      void qc.invalidateQueries({ queryKey: ["volume", volume.id] });
      void qc.invalidateQueries({ queryKey: ["volumes"] });
    },
  });
  const items = volume.used_by ?? [];

  return (
    <>
      <div>
        <TableSectionHeader
          title="关联实例"
          extra={
            items.length === 0 ? (
              <Button onClick={() => setAttachVisible(true)}>挂载</Button>
            ) : undefined
          }
        />
        <DataTable<MountedInstance>
          columns={[
            { title: "实例名称", dataIndex: "instance_name" },
            { title: "实例 ID", dataIndex: "instance_id" },
            { title: "实例类型", dataIndex: "kind", placeholder: "-" },
            { title: "状态", render: (_, item) => <StatusTag status={item.state} /> },
          ]}
          data={items}
          pagination={false}
          rowActions={[
            {
              key: "detach",
              label: "卸载",
              intent: "danger",
              loading: () => detach.isPending,
              onClick: (item) =>
                void Modal.confirm({
                  title: "卸载块存储卷",
                  content: `确定从实例「${item.instance_name}」卸载该卷？`,
                  okButtonProps: { status: "danger" },
                  onOk: () => detach.mutateAsync(item.instance_id),
                }),
            },
          ]}
          noDataElement={<Empty description="该卷当前未挂载实例，点击右上角「挂载」开始" />}
        />
      </div>
      {attachVisible && (
        <AttachVolumeModal volumeId={volume.id} onCancel={() => setAttachVisible(false)} />
      )}
    </>
  );
}
