import { Progress, Typography } from "@arco-design/web-react";
import type { GpuOccupancyStats } from "@/api/gpu-inventory";
import { ListDataTable } from "@/components/common";
import { useGpuOccupancyQuery } from "../useGpuOccupancyQuery";

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

export function GpuModelInventory({ onCreate }: { onCreate: () => void }) {
  const occupancy = useGpuOccupancyQuery();
  const modelInventory = getModelInventory(occupancy.data);

  return (
    <section className="mt-5">
      <ListDataTable<ModelInventoryRow>
        header={{
          title: "型号库存",
          extra: (
            <Typography.Text type="secondary">共 {modelInventory.length} 个型号</Typography.Text>
          ),
        }}
        rowKey="id"
        data={modelInventory}
        loading={occupancy.isLoading}
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
        ]}
        rowActions={[{ key: "create", label: "创建容器", onClick: onCreate }]}
      />
    </section>
  );
}
