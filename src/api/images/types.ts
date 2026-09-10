import type { CoreDevProfileInfo, CursorPageParams } from "@/api/types";

export type ImageFormat = "iso" | "qcow2" | "raw";
export type ImageState =
  | "pending"
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "deleting"
  | "deleted";

export interface Image {
  id: string;
  tenant_id: string;
  name: string;
  format: ImageFormat;
  size_gib: number;
  content_type?: string | null;
  state: ImageState;
  reason?: string | null;
  message?: string | null;
  volume_id?: string | null;
  storage_class?: string | null;
  dev_profile?: CoreDevProfileInfo;
  created_at: string;
  updated_at: string;
}

export interface ImageListResponse {
  items: Image[];
  total: number;
  next_cursor?: string | null;
}

export type ImageListParams = CursorPageParams;

export interface CreateImageUploadInput {
  name: string;
  format: ImageFormat;
  size_gib: number;
  content_type?: string | null;
  storage_class?: string | null;
}

export type CreateImageUploadRequest = CreateImageUploadInput & { idempotency_key: string };

export interface ImageUploadSession {
  image: Image;
  upload_url: string;
  token: string;
  expires_at: string;
  method: "PUT" | "POST";
}

export interface ImageUploadProgress {
  phase: "preparing" | "uploading" | "processing";
  percent: number;
  loadedBytes?: number;
  totalBytes?: number;
  message?: string;
}

export interface UploadImageFileInput {
  file: File;
  name?: string;
  sizeGib?: number;
  contentType?: string;
  onProgress?: (update: ImageUploadProgress) => void;
  signal?: AbortSignal;
}
