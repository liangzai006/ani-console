import { runIdempotentRequest } from "@/api/idempotency";
import { servicesRequest } from "@/api/request";
import type { AsyncTask } from "@/api/tasks";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  ImportModelInput,
  ImportModelRequest,
  Model,
  ModelListParams,
  ModelListResponse,
} from "./types";

const importScope = createIdempotencyScope("model-import", ["POST"]);

export function listModels(params: ModelListParams = {}): Promise<ModelListResponse> {
  return servicesRequest<ModelListResponse>("/models", { method: "GET", params });
}

export function getModel(modelId: string): Promise<Model> {
  return servicesRequest<Model>(`/models/${encodeURIComponent(modelId)}`, { method: "GET" });
}

export function importModel(submitData: ImportModelInput): Promise<AsyncTask> {
  return runIdempotentRequest(importScope, submitData, (body) =>
    servicesRequest<AsyncTask, ImportModelRequest>("/models/import", {
      method: "POST",
      data: body,
    }),
  );
}

export function deleteModel(modelId: string): Promise<void> {
  return servicesRequest<void>(`/models/${encodeURIComponent(modelId)}`, { method: "DELETE" });
}

export type {
  ImportModelInput,
  ImportModelRequest,
  Model,
  ModelListParams,
  ModelListResponse,
  ModelSource,
  ModelStatus,
  ModelVersion,
} from "./types";
