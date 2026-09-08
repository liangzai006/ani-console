import { Space, Tooltip } from "@arco-design/web-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import {
  ListPageFrame,
  ListPageHeader,
  ToolbarButton,
} from "@/components/common";
import { GpuContainerCreateModal } from "@/components/instances/GpuContainerCreateModal";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { GpuCapacityOverview } from "./GpuCapacityOverview";
import type {
  GpuSpecAvailabilityListResponse,
  TenantQuotaResponse,
} from "./types";

type GpuOccupancy = components["schemas"]["GPUOccupancyStats"];
type GpuInventoryRecord = components["schemas"]["GPUInventoryRecord"];

async function getGpuSpecAvailability() {
  const request = coreApi.GET as unknown as (
    path: "/gpu-specs/availability",
  ) => Promise<{
    data?: GpuSpecAvailabilityListResponse;
    error?: unknown;
  }>;
  const { data, error } = await request("/gpu-specs/availability");

  if (error || !data) {
    throw error ?? new Error("GPU 规格可用性未返回结果");
  }

  return data;
}

async function getMyQuota() {
  const request = coreApi.GET as unknown as (path: "/quotas/me") => Promise<{
    data?: TenantQuotaResponse;
    error?: unknown;
  }>;
  const { data, error } = await request("/quotas/me");

  if (error || !data) {
    throw error ?? new Error("租户配额未返回结果");
  }

  return data;
}

async function getGpuAnomalies(): Promise<GpuInventoryRecord[]> {
  const [faultResponse, maintenanceResponse] = await Promise.all([
    coreApi.GET("/gpu-inventory", {
      params: { query: { status: "fault", limit: 200 } },
    }),
    coreApi.GET("/gpu-inventory", {
      params: { query: { status: "maintenance", limit: 200 } },
    }),
  ]);

  if (
    faultResponse.error ||
    maintenanceResponse.error ||
    !faultResponse.data ||
    !maintenanceResponse.data
  ) {
    throw (
      faultResponse.error ??
      maintenanceResponse.error ??
      new Error("GPU 异常数据未返回结果")
    );
  }

  return [...faultResponse.data.items, ...maintenanceResponse.data.items];
}

export function GpuInventoryPage() {
  const queryClient = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);
  const occupancy = useQuery<GpuOccupancy>({
    queryKey: ["gpu-occupancy"],
    queryFn: async () => {
      const { data, error } = await coreApi.GET("/gpu-inventory/occupancy");
      if (error || !data) {
        throw error ?? new Error("GPU 占用数据未返回结果");
      }
      return data;
    },
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
    queryFn: getGpuAnomalies,
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
