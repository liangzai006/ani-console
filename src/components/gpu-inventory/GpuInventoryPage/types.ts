export type GpuSpecAvailability = {
  spec_id: string;
  status: "available" | "full" | "device_full" | "unavailable";
  available_count: number;
  has_matching_nodes: boolean;
  has_idle_devices: boolean;
  device_idle_count: number;
  gpu_count?: number;
};

export type GpuSpecAvailabilityListResponse = {
  items: GpuSpecAvailability[];
  quota_remaining: number;
};

export type TenantQuotaItem = {
  resource_type: string;
  total: number;
  used: number;
  reserved: number;
};

export type TenantQuotaResponse = {
  tenant_id: string;
  tenant_name?: string;
  items: TenantQuotaItem[];
};
