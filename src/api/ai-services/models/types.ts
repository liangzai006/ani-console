export type ModelSource = "upload" | "huggingface" | "modelscope" | "builtin";
export type ModelStatus = "pending" | "downloading" | "ready" | "error" | "deleted";

export interface ModelVersion {
  id: string;
  model_id: string;
  version: string;
  format: "safetensors" | "gguf" | "pytorch" | string;
  is_encrypted?: boolean;
  size_bytes?: number;
  checksum_sha256?: string | null;
  storage_path?: string;
  created_at: string;
}

export interface Model {
  id: string;
  name: string;
  display_name?: string;
  description?: string | null;
  source: ModelSource;
  capabilities?: string[];
  status: ModelStatus;
  total_size_bytes?: number;
  created_at: string;
  updated_at?: string | null;
  versions?: ModelVersion[];
}

export interface ModelListParams {
  keyword?: string;
  source?: ModelSource;
  capability?: "text-generation" | "embedding" | "speech-to-text";
  status?: ModelStatus;
  limit?: number;
  cursor?: string;
}

export interface ModelListResponse {
  items: Model[];
  total?: number;
  next_cursor?: string | null;
}

export interface ImportModelInput {
  source: "huggingface" | "modelscope";
  repo_id: string;
  revision?: string;
  webhook_url?: string;
}

export interface ImportModelRequest extends ImportModelInput {
  idempotency_key: string;
}
