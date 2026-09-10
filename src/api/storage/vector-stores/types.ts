import type { CoreDevProfileInfo, CursorPageParams } from "@/api/types";

export type VectorMetric = "cosine" | "l2" | "ip";
export type VectorStoreState = "pending" | "ready" | "failed" | "deleting" | "deleted";

export interface VectorStore {
  id: string;
  tenant_id: string;
  name: string;
  dimension: number;
  metric: VectorMetric;
  state: VectorStoreState;
  embedding_model?: string;
  vector_count?: number;
  index_status?: string;
  last_indexed_at?: string;
  knowledge_base_ref?: {
    id: string;
    name: string;
    source: string;
  };
  reason?: string | null;
  dev_profile?: CoreDevProfileInfo;
  created_at: string;
  updated_at: string;
}

export interface VectorStoreListParams extends CursorPageParams {
  status?: string;
  search_field?: "name" | "id";
  keyword?: string;
}
export interface VectorStoreListResponse {
  items: VectorStore[];
  total: number;
  next_cursor?: string | null;
}

export interface CreateVectorStoreInput {
  name: string;
  dimension: number;
  metric: VectorMetric;
  embedding_model?: string;
}
export type CreateVectorStoreRequest = CreateVectorStoreInput & { idempotency_key: string };

export interface VectorStoreSearchInput {
  vector: number[];
  top_k: number;
  filter?: Record<string, string>;
}
export type VectorStoreSearchRequest = VectorStoreSearchInput & { idempotency_key: string };

export interface VectorStoreSearchHit {
  id: string;
  score: number;
  metadata: Record<string, string>;
}
export interface VectorStoreSearchResponse {
  items: VectorStoreSearchHit[];
  total: number;
}
