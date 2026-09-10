import type { CoreDevProfileInfo, CursorPageParams } from "@/api/types";

export type GpuInventoryStatus = "available" | "in_use" | "fault" | "maintenance";

export interface GpuInventoryRecord {
  id: string;
  node_name: string;
  gpu_type: string;
  gpu_index: number;
  memory_total_mb?: number;
  driver_version?: string | null;
  status: GpuInventoryStatus;
  tenant_id?: string | null;
  instance_id?: string | null;
  dev_profile: CoreDevProfileInfo;
}

export interface GpuInventoryListParams extends CursorPageParams {
  gpu_type?: string;
  status?: GpuInventoryStatus;
  node_name?: string;
}

export interface GpuInventoryListResponse {
  items: GpuInventoryRecord[];
  next_cursor?: string | null;
  total: number;
  dev_profile: CoreDevProfileInfo;
}

export interface GpuOccupancyStats {
  total: number;
  in_use: number;
  available: number;
  fault: number;
  by_gpu_type?: Array<{
    gpu_type?: string;
    total?: number;
    in_use?: number;
    available?: number;
  }>;
  dev_profile: CoreDevProfileInfo;
}

export interface GpuSpecAvailability {
  spec_id: string;
  status: "available" | "full" | "device_full" | "unavailable";
  available_count: number;
  has_matching_nodes: boolean;
  has_idle_devices: boolean;
  device_idle_count: number;
  gpu_count?: number;
}

export interface GpuSpecAvailabilityListResponse {
  items: GpuSpecAvailability[];
  quota_remaining: number;
}

export interface GpuSpec {
  id: string;
  name: string;
  gpu_type?: string;
  vendor?: string;
  model?: string;
  gpu_count?: number;
  shares?: number;
  mb_per_share?: number;
  cpu?: string;
  memory?: string;
  available?: boolean;
  [key: string]: unknown;
}
export interface GpuSpecListResponse {
  items: GpuSpec[];
  total: number;
  next_cursor?: string | null;
}
export interface GpuSchedulingQueue {
  id: string;
  name: string;
  status?: string;
  pending_count?: number;
  [key: string]: unknown;
}
export interface GpuSchedulingQueueListResponse {
  items: GpuSchedulingQueue[];
  total: number;
  next_cursor?: string | null;
}

export interface TenantQuotaItem {
  resource_type: string;
  total: number;
  used: number;
  reserved: number;
}

export interface TenantQuotaResponse {
  tenant_id: string;
  tenant_name?: string;
  items: TenantQuotaItem[];
}
