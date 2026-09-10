import { Space, Tooltip } from "@arco-design/web-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getGpuOccupancy,
  getGpuSpecAvailability,
  getMyQuota,
  listGpuAnomalies,
  type GpuOccupancyStats,
} from "@/api/gpu-inventory";
import { ListPageFrame, ListPageHeader, ToolbarButton } from "@/components/common";
import { GpuContainerCreateModal } from "@/components/instances/GpuContainerCreateModal";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { GpuCapacityOverview } from "./GpuCapacityOverview";

export function GpuInventoryPage() {
  const queryClient = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const occupancy = useQuery<GpuOccupancyStats>({
    queryKey: ["gpu-occupancy"],
    queryFn: getGpuOccupancy,
  });
  const specAvailability = useQuery({
    queryKey: ["gpu-specs", "availability"],
    queryFn: getGpuSpecAvailability,
  });
  const tenantQuota = useQuery({
    queryKey: ["quotas", "me"],
    queryFn: getMyQuota,
  });
  const anomalies = useQuery({
    queryKey: ["gpu-inventory", "anomalies"],
    queryFn: listGpuAnomalies,
  });

  useListErrorNotification({
    id: "gpu-inventory-occupancy",
    title: "GPU 占用数据加载失败",
    error: occupancy.error,
  });
  useListErrorNotification({
    id: "gpu-spec-availability-summary",
    title: "GPU 规格可用性加载失败",
    error: specAvailability.error,
  });
  useListErrorNotification({
    id: "gpu-tenant-quota",
    title: "租户 GPU 配额加载失败",
    error: tenantQuota.error,
  });
  useListErrorNotification({
    id: "gpu-inventory-anomalies",
    title: "GPU 异常数据加载失败",
    error: anomalies.error,
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
        header={
          <ListPageHeader
            iconClassName="icon-GPU"
            title="GPU 算力管理"
            subtitle="查看租户配额、规格准入、占用分布与型号库存"
            extra={
              <Space size={8}>
                <Tooltip content="当前 Core API 尚未开放 GPU 配额申请">
                  <span>
                    <ToolbarButton disabled>申请扩容</ToolbarButton>
                  </span>
                </Tooltip>
                <ToolbarButton
                  variant="primary"
                  iconClassName="icon-add-1"
                  onClick={() => setCreateVisible(true)}
                >
                  创建 GPU 容器
                </ToolbarButton>
              </Space>
            }
          />
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <GpuCapacityOverview
            occupancy={occupancy.data}
            occupancyLoading={occupancy.isLoading}
            occupancyError={occupancy.error}
            availability={specAvailability.data}
            availabilityLoading={specAvailability.isLoading}
            availabilityError={specAvailability.error}
            quota={tenantQuota.data}
            quotaLoading={tenantQuota.isLoading}
            quotaError={tenantQuota.error}
            anomalies={anomalies.data}
            anomaliesLoading={anomalies.isLoading}
            anomaliesError={anomalies.error}
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
