import type { StorageVolumeMountHistoryEntry } from "@/api/storage/volumes";
import { DataTable, StatusTag } from "@/components/common";
import { formatDateTime } from "@/lib/format";
import { Empty } from "@arco-design/web-react";

const actionText: Record<StorageVolumeMountHistoryEntry["action"], string> = {
  mount: "挂载",
  unmount: "卸载",
  create_from_snapshot: "从快照创建",
  os_init: "OS 初始化",
};

export function VolumeMountHistory({ items }: { items: StorageVolumeMountHistoryEntry[] }) {
  return (
    <DataTable<StorageVolumeMountHistoryEntry>
      columns={[
        { title: "时间", render: (_, item) => formatDateTime(item.at) },
        { title: "操作", render: (_, item) => actionText[item.action] },
        { title: "目标", dataIndex: "target", placeholder: "-" },
        { title: "结果", render: (_, item) => <StatusTag status={item.result} /> },
      ]}
      data={items}
      pagination={false}
      noDataElement={<Empty description="暂无挂载历史" />}
    />
  );
}
