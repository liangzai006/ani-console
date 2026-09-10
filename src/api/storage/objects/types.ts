import type { CoreDevProfileInfo } from "@/api/types";
import type { StorageResourceState } from "@/api/storage/volumes";

export interface StorageObject {
  id: string;
  tenant_id: string;
  bucket: string;
  key: string;
  size_bytes: number;
  content_type: string;
  state: StorageResourceState;
  reason?: string | null;
  dev_profile?: CoreDevProfileInfo;
  created_at: string;
  updated_at: string;
}

export interface StorageObjectUploadInput {
  bucket_id: string;
  key: string;
  content_type?: string;
}
export type StorageObjectUploadRequest = StorageObjectUploadInput & { idempotency_key: string };

export interface StorageObjectUploadResponse {
  upload_url: string;
  object_id: string;
  expires_at?: string;
}

export type StorageObjectCompleteRequest = { idempotency_key: string };

export interface StorageObjectDownloadInfo {
  download_url: string;
  expires_at?: string;
  content_type?: string | null;
  size_bytes?: number | null;
}

export interface UploadStorageObjectFileInput {
  bucketId: string;
  file: File;
  prefix?: string;
  signal?: AbortSignal;
}
