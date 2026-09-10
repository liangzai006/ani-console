import { Progress, Typography } from "@arco-design/web-react";
import type { GpuOccupancyStats } from "@/api/gpu-inventory";
import { DataTableRowActionButton, ListDataTable, TableSectionHeader } from "@/components/common";

type ModelInventoryRow = {
  id: string;
  gpuType: string;
  total: number;
  available: number;
  inUse: number;
  unavailable: number;
};

function getModelInventory(occupancy?: GpuOccupancyStats): ModelInventoryRow[] {
  return (occupancy?.by_gpu_type ?? []).map((bucket, index) => {
    const total = bucket.total ?? 0;
    const available = bucket.available ?? 0;
    const inUse = bucket.in_use ?? 0;

    return {
      id: String(bucket.gpu_type ?? "unknown") + "-" + index,
      gpuType: bucket.gpu_type || "-",
      total,
      available,
      inUse,
      unavailable: Math.max(0, total - available - inUse),
    };
  });
}

export function GpuModelInventory({
  occupancy,
  loading,
  onCreate,
}: {
  occupancy?: GpuOccupancyStats;
  loading: boolean;
  onCreate: () => void;
}) {
  const modelInventory = getModelInventory(occupancy);

  return (
    <section className="mt-5">
      <TableSectionHeader
        title="型号库存"
        extra={
          <Typography.Text type="secondary">共 {modelInventory.length} 个型号</Typography.Text>
        }
      />
      <ListDataTable<ModelInventoryRow>
        rowKey="id"
        data={modelInventory}
        loading={loading}
        pagination={false}
        scroll={{ x: false, y: false }}
        emptyIconClassName="icon-GPU"
        emptyText="暂无 GPU 型号库存"
        tableLabel="GPU 型号库存"
        columns={[
          {
            key: "gpuType",
            title: "GPU 型号",
            dataIndex: "gpuType",
            ellipsis: true,
          },
          { key: "total", title: "总量", dataIndex: "total" },
          { key: "available", title: "可用", dataIndex: "available" },
          { key: "inUse", title: "占用中", dataIndex: "inUse" },
          {
            key: "unavailable",
            title: "异常 / 维护",
            dataIndex: "unavailable",
          },
          {
            key: "usage",
            title: "占用率",
            width: 180,
            render: (_, row) => (
              <Progress
                size="small"
                percent={row.total > 0 ? Math.round((row.inUse / row.total) * 100) : 0}
              />
            ),
          },
          {
            key: "__actions",
            title: "操作",
            render: () => (
              <DataTableRowActionButton onClick={onCreate}>创建容器</DataTableRowActionButton>
            ),
          },
        ]}
      />
    </section>
  );
}
