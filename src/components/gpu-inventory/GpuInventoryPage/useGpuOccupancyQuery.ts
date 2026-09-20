import { useQuery } from "@tanstack/react-query";
import { getGpuOccupancy, type GpuOccupancyStats } from "@/api/gpu-inventory";

export function useGpuOccupancyQuery() {
  return useQuery<GpuOccupancyStats>({
    meta: {
      errorNotification: {
        id: "gpu-inventory-occupancy",
        action: "GPU 占用数据加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["gpu-occupancy"],
    queryFn: getGpuOccupancy,
  });
}
