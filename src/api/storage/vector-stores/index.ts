import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import type { AsyncTask } from "@/api/tasks";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateVectorStoreInput,
  CreateVectorStoreRequest,
  VectorStore,
  VectorStoreListParams,
  VectorStoreListResponse,
  VectorStoreSearchInput,
  VectorStoreSearchRequest,
  VectorStoreSearchResponse,
} from "./types";

const createScope = createIdempotencyScope("storage-vector-store-create", ["POST"]);
const searchScope = createIdempotencyScope("storage-vector-store-search", ["POST"]);
const rebuildScope = createIdempotencyScope("storage-vector-store-rebuild", ["POST"]);
const vectorStorePath = (vectorStoreId: string) =>
  `/vector-stores/${encodeURIComponent(vectorStoreId)}`;

export function listVectorStores(
  params: VectorStoreListParams = {},
): Promise<VectorStoreListResponse> {
  return coreRequest<VectorStoreListResponse>("/vector-stores", { method: "GET", params });
}

export function createVectorStore(submitData: CreateVectorStoreInput): Promise<VectorStore> {
  return runIdempotentRequest(createScope, submitData, (body) =>
    coreRequest<VectorStore, CreateVectorStoreRequest>("/vector-stores", {
      method: "POST",
      data: body,
    }),
  );
}

export function getVectorStore(vectorStoreId: string): Promise<VectorStore> {
  return coreRequest<VectorStore>(vectorStorePath(vectorStoreId), { method: "GET" });
}

export function deleteVectorStore(vectorStoreId: string): Promise<VectorStore> {
  return coreRequest<VectorStore>(vectorStorePath(vectorStoreId), { method: "DELETE" });
}

export function searchVectorStore(
  vectorStoreId: string,
  submitData: VectorStoreSearchInput,
): Promise<VectorStoreSearchResponse> {
  return runIdempotentRequest(
    searchScope,
    submitData,
    (body) =>
      coreRequest<VectorStoreSearchResponse, VectorStoreSearchRequest>(
        `${vectorStorePath(vectorStoreId)}/search`,
        { method: "POST", data: body },
      ),
    [vectorStoreId],
  );
}

export function rebuildVectorStoreIndex(vectorStoreId: string): Promise<AsyncTask> {
  return runIdempotentRequest(
    rebuildScope,
    {},
    (body) =>
      coreRequest<AsyncTask, { idempotency_key: string }>(
        `${vectorStorePath(vectorStoreId)}/rebuild-index`,
        { method: "POST", data: body },
      ),
    [vectorStoreId],
  );
}

export type {
  CreateVectorStoreInput,
  CreateVectorStoreRequest,
  VectorMetric,
  VectorStore,
  VectorStoreListParams,
  VectorStoreListResponse,
  VectorStoreSearchHit,
  VectorStoreSearchInput,
  VectorStoreSearchRequest,
  VectorStoreSearchResponse,
  VectorStoreState,
} from "./types";
