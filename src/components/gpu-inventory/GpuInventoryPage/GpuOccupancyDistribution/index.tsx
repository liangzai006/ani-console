import { Card, Empty, Skeleton } from "@arco-design/web-react";
import type { EChartsOption } from "echarts";
import { CorePieChart } from "@/components/common";
import { useGpuOccupancyQuery } from "../useGpuOccupancyQuery";

export function GpuOccupancyDistribution() {
  const occupancy = useGpuOccupancyQuery();
  const total = occupancy.data?.total ?? 0;
  const inUse = occupancy.data?.in_use ?? 0;
  const available = occupancy.data?.available ?? 0;
  const fault = occupancy.data?.fault ?? 0;
  const maintenance = Math.max(0, total - inUse - available - fault);
  const unavailable = fault + maintenance;
  const chart: EChartsOption = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
    series: [
      {
        type: "pie",
        radius: ["42%", "70%"],
        center: ["50%", "43%"],
        label: { show: false },
        data: [
          { name: "占用中", value: inUse },
          { name: "空闲", value: available },
          { name: "异常 / 维护", value: unavailable },
        ],
      },
    ],
  };

  return (
    <Card title="占用分布" className="h-full">
      {occupancy.isLoading ? (
        <Skeleton animation text={{ rows: 5 }} />
      ) : total > 0 ? (
        <CorePieChart option={chart} className="h-56 w-full" />
      ) : (
        <div className="flex h-56 items-center justify-center">
          <Empty description="暂无 GPU 占用数据" />
        </div>
      )}
    </Card>
  );
}
