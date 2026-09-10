import type { AsyncTask } from "@/api/tasks";
import type { CoreDevProfileInfo, CursorPageParams } from "@/api/types";

export type StorageResourceState = "pending" | "available" | "failed" | "deleting" | "deleted";

export interface StorageVolumeAutoSnapshotPolicy {
  enabled: boolean;
  retain_days: number;
  schedule: string;
}

export interface StorageVolume {
  id: string;
  tenant_id: string;
  name: string;
  size_gib: number;
  storage_class: string;
  zone?: string | null;
  volume_type?: "ssd" | "hdd" | "high_performance_ssd" | null;
  iops?: number | null;
  encrypted?: boolean | null;
  mount_instance_id?: string | null;
  mount_route?: string | null;
  mount_name?: string | null;
  in_use?: boolean;
  used_by?: Array<{
    instance_id: string;
    instance_name: string;
    kind: string;
    state: string;
    mount_path?: string | null;
  }>;
  snapshots_count?: number | null;
  auto_snapshot?: StorageVolumeAutoSnapshotPolicy;
  os_init_status?: string | null;
  os_init_device?: string | null;
  from_snapshot_id?: string | null;
  from_snapshot_name?: string | null;
  state: StorageResourceState;
  reason?: string | null;
  dev_profile?: CoreDevProfileInfo;
  created_at: string;
  updated_at: string;
}

export interface StorageVolumeListParams extends CursorPageParams {
  status?: string;
  search_field?: "name" | "id";
  keyword?: string;
  in_use?: boolean;
  available_for_instance_id?: string;
}

export interface StorageVolumeListResponse {
  items: StorageVolume[];
  total: number;
  next_cursor?: string | null;
}

export interface CreateStorageVolumeInput {
  name: string;
  size_gib: number;
  storage_class: string;
  zone?: string;
  volume_type?: "ssd" | "hdd" | "high_performance_ssd";
  encrypted?: boolean;
  mount_instance_id?: string | null;
  mount_route?: string | null;
}

export type CreateStorageVolumeRequest = CreateStorageVolumeInput & { idempotency_key: string };
export interface StorageVolumeExpandInput {
  size_gib: number;
}
export type StorageVolumeExpandRequest = StorageVolumeExpandInput & { idempotency_key: string };

export interface VolumeSnapshotRecord {
  id: string;
  volume_id: string;
  name: string;
  status: "creating" | "available" | "error" | "deleting";
  size_bytes: number;
  created_at: string;
  dev_profile: CoreDevProfileInfo;
}

export interface VolumeSnapshotListResponse {
  items: VolumeSnapshotRecord[];
  total: number;
  next_cursor?: string | null;
}

export interface CreateVolumeSnapshotInput {
  name: string;
  description?: string;
}
export type CreateVolumeSnapshotRequest = CreateVolumeSnapshotInput & { idempotency_key: string };

export interface VolumeOSInitStep {
  title: string;
  command: string;
}
export interface VolumeOSInitGuide {
  status: string;
  device: string;
  steps: VolumeOSInitStep[];
  hint: string;
}
export interface VolumeOSInitCompleteInput {
  mode: "done" | "skipped";
}
export type VolumeOSInitCompleteRequest = VolumeOSInitCompleteInput & {
  idempotency_key: string;
};

export type StorageAsyncTask = AsyncTask;
