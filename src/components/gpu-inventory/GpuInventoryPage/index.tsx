import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getGpuOccupancy,
  getGpuSpecAvailability,
  getMyQuota,
  listGpuAnomalies,
  type GpuOccupancyStats,
} from "@/api/gpu-inventory";
import { ListPageFrame } from "@/components/common";
import { GpuContainerCreateModal } from "@/components/instances/GpuContainerCreateModal";
import { GpuCapacityOverview } from "./GpuCapacityOverview";

export function GpuInventoryPage() {
  const queryClient = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const occupancy = useQuery<GpuOccupancyStats>({
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
  const specAvailability = useQuery({
    meta: {
      errorNotification: {
        id: "gpu-spec-availability-summary",
        action: "GPU 规格可用性加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["gpu-specs", "availability"],
    queryFn: getGpuSpecAvailability,
  });
  const tenantQuota = useQuery({
    meta: {
      errorNotification: {
        id: "gpu-tenant-quota",
        action: "租户 GPU 配额加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["quotas", "me"],
    queryFn: getMyQuota,
  });
  const anomalies = useQuery({
    meta: {
      errorNotification: {
        id: "gpu-inventory-anomalies",
        action: "GPU 异常数据加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["gpu-inventory", "anomalies"],
    queryFn: listGpuAnomalies,
  });

  const refreshGpuData = () => {
    void queryClient.invalidateQueries({ queryKey: ["gpu-inventory"] });
    void queryClient.invalidateQueries({ queryKey: ["gpu-occupancy"] });
    void queryClient.invalidateQueries({
      queryKey: ["gpu-specs", "availability"],
    });
    void queryClient.invalidateQueries({ queryKey: ["quotas", "me"] });
  };

  return (
    <>
      <ListPageFrame
        header={{
          iconClassName: "icon-GPU",
          title: "GPU 算力管理",
          subtitle: "查看租户配额、规格准入、占用分布与型号库存",
          actions: [
            {
              key: "header-action-1",
              label: "申请扩容",
              disabled: true,
              tooltip: "当前 Core API 尚未开放 GPU 配额申请",
            },
            {
              key: "header-action-2",
              label: "创建 GPU 容器",
              iconClassName: "icon-add-1",
              variant: "primary",
              onClick: () => setCreateVisible(true),
            },
          ],
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <GpuCapacityOverview
            occupancy={occupancy.data}
            occupancyLoading={occupancy.isLoading}
            availability={specAvailability.data}
            availabilityLoading={specAvailability.isLoading}
            quota={tenantQuota.data}
            quotaLoading={tenantQuota.isLoading}
            anomalies={anomalies.data}
            anomaliesLoading={anomalies.isLoading}
            onCreate={() => setCreateVisible(true)}
          />
        </div>
      </ListPageFrame>
      <GpuContainerCreateModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
        onCreated={() => {
          setCreateVisible(false);
          refreshGpuData();
        }}
      />
    </>
  );
}
