import { listVolumeSnapshots, type VolumeSnapshotRecord } from "@/api/storage/volumes";
import { DataTable, StatusTag } from "@/components/common";
import { CreateVolumeSnapshotModal } from "@/components/storage/CreateVolumeSnapshotModal";
import { formatBytes, formatDateTime } from "@/lib/format";
import { withId } from "@/lib/id";
import { Button, Empty } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function VolumeSnapshots({ volumeId }: { volumeId: string }) {
  const [visible, setVisible] = useState(false);
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
  const items = (snapshots.data?.items ?? []) as VolumeSnapshotRecord[];

  return (
    <>
      <div>
        <DataTable<VolumeSnapshotRecord>
          header={{
            title: "快照",
            extra: <Button onClick={() => setVisible(true)}>创建快照</Button>,
          }}
          columns={[
            { title: "名称", dataIndex: "name" },
            {
              title: "状态",
              width: 120,
              render: (_, row) => <StatusTag status={row.status} />,
            },
            { title: "大小", render: (_, row) => formatBytes(row.size_bytes) },
            { title: "创建时间", render: (_, row) => formatDateTime(row.created_at) },
          ]}
          data={items}
          loading={snapshots.isLoading}
          pagination={false}
          noDataElement={<Empty description="暂无快照，点击右上角「创建快照」开始" />}
        />
      </div>
      {visible && (
        <CreateVolumeSnapshotModal volumeId={volumeId} onCancel={() => setVisible(false)} />
      )}
    </>
  );
}
