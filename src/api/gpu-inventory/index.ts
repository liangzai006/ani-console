import { coreRequest } from "@/api/request";
import type {
  GpuInventoryListParams,
  GpuInventoryListResponse,
  GpuInventoryRecord,
  GpuOccupancyStats,
  GpuSpecAvailabilityListResponse,
  GpuSpecListResponse,
  GpuSchedulingQueueListResponse,
  TenantQuotaResponse,
} from "./types";

export function listGpuInventory(
  params: GpuInventoryListParams = {},
): Promise<GpuInventoryListResponse> {
  return coreRequest<GpuInventoryListResponse>("/gpu-inventory", { method: "GET", params });
}

export function getGpuOccupancy(): Promise<GpuOccupancyStats> {
  return coreRequest<GpuOccupancyStats>("/gpu-inventory/occupancy", { method: "GET" });
}

export function getGpuSpecAvailability(): Promise<GpuSpecAvailabilityListResponse> {
  return coreRequest<GpuSpecAvailabilityListResponse>("/gpu-specs/availability", {
    method: "GET",
  });
}

export function listGpuSpecs(
  params: { available?: boolean; limit?: number } = {},
): Promise<GpuSpecListResponse> {
  return coreRequest<GpuSpecListResponse>("/gpu-specs", { method: "GET", params });
}

export function listGpuSchedulingQueues(
  params: { limit?: number } = {},
): Promise<GpuSchedulingQueueListResponse> {
  return coreRequest<GpuSchedulingQueueListResponse>("/gpu-scheduling/queues", {
    method: "GET",
    params,
  });
}

export function getMyQuota(): Promise<TenantQuotaResponse> {
  return coreRequest<TenantQuotaResponse>("/quotas/me", { method: "GET" });
}

export async function listGpuAnomalies(): Promise<GpuInventoryRecord[]> {
  const [faults, maintenance] = await Promise.all([
    listGpuInventory({ status: "fault", limit: 200 }),
    listGpuInventory({ status: "maintenance", limit: 200 }),
  ]);
  return [...faults.items, ...maintenance.items];
}

export type {
  GpuInventoryListParams,
  GpuInventoryListResponse,
  GpuInventoryRecord,
  GpuInventoryStatus,
  GpuOccupancyStats,
  GpuSpecAvailability,
  GpuSpecAvailabilityListResponse,
  GpuSpec,
  GpuSpecListResponse,
  GpuSchedulingQueue,
  GpuSchedulingQueueListResponse,
  TenantQuotaItem,
  TenantQuotaResponse,
} from "./types";
