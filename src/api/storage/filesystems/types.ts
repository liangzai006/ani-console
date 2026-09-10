import type { CoreDevProfileInfo, CursorPageParams } from "@/api/types";
import type { StorageResourceState } from "@/api/storage/volumes";

export interface StorageFilesystem {
  id: string;
  tenant_id: string;
  name: string;
  protocol: "nfs" | "cephfs";
  size_gib: number;
  endpoint?: string | null;
  performance_mode?: "standard" | "throughput" | null;
  state: StorageResourceState;
  reason?: string | null;
  in_use?: boolean;
  used_by?: Array<{
    instance_id: string;
    instance_name: string;
    kind: string;
    state: string;
    mount_path?: string | null;
  }>;
  dev_profile?: CoreDevProfileInfo;
  created_at: string;
  updated_at: string;
}

export interface StorageFilesystemListParams extends CursorPageParams {
  status?: string;
  search_field?: "name" | "id";
  keyword?: string;
  in_use?: boolean;
  protocol?: "nfs" | "cephfs";
  available_for_instance_id?: string;
}

export interface StorageFilesystemListResponse {
  items: StorageFilesystem[];
  total: number;
  next_cursor?: string | null;
}

export interface CreateStorageFilesystemInput {
  name: string;
  protocol: "nfs" | "cephfs";
  size_gib: number;
  performance_mode: "standard" | "throughput";
}
export type CreateStorageFilesystemRequest = CreateStorageFilesystemInput & {
  idempotency_key: string;
};

export interface FilesystemMountTarget {
  id: string;
  filesystem_id: string;
  subnet_id: string;
  vpc_id?: string | null;
  ip_address: string;
  status: "creating" | "available" | "deleting" | "error";
  created_at: string;
  dev_profile: CoreDevProfileInfo;
}

export interface FilesystemMountTargetListResponse {
  items: FilesystemMountTarget[];
  total: number;
  next_cursor?: string | null;
}

export interface CreateFilesystemMountTargetInput {
  subnet_id: string;
  vpc_id?: string;
}
export type CreateFilesystemMountTargetRequest = CreateFilesystemMountTargetInput & {
  idempotency_key: string;
};

export interface StorageFilesystemExpandInput {
  size_gib: number;
}
export type StorageFilesystemExpandRequest = StorageFilesystemExpandInput & {
  idempotency_key: string;
};
