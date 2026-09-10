export interface InferenceServiceAccelerator {
  spec_id: string;
  count_per_replica: number;
  memory?: number;
}

export interface InferenceServiceResources {
  cpu: string;
  memory: string;
  accelerator?: InferenceServiceAccelerator;
}

export interface InferenceServiceEngine {
  env?: Array<{ name: string; value: string }>;
  command?: string[];
}

export interface InferenceService {
  id: string;
  name: string;
  model: string;
  model_version_id?: string | null;
  served_model_name: string;
  image_id?: string | null;
  image_ref?: string | null;
  replicas: number;
  ready_replicas: number;
  resources?: InferenceServiceResources | null;
  placement_mode: "auto" | "single_node" | "multi_node" | string;
  engine?: InferenceServiceEngine | null;
  gpu_type?: string | null;
  gpu_count_per_pod: number;
  max_concurrency: number;
  status: string;
  status_reason?: string | null;
  status_message?: string | null;
  generation: number;
  observed_generation: number;
  current_operation_id?: string | null;
  invocation_url?: string | null;
  endpoint_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface InferenceServiceListParams {
  limit?: number;
  offset?: number;
  status?: string;
  model?: string;
  search_field?: "name" | "id";
  keyword?: string;
}

export interface InferenceServiceListResponse {
  items: InferenceService[];
  total?: number;
}

export interface CreateInferenceServiceInput {
  name: string;
  model: string;
  model_version_id?: string;
  served_model_name?: string;
  replicas?: number;
  resources?: InferenceServiceResources;
  placement_mode?: "auto" | "single_node" | "multi_node";
  image_id?: string;
  image_ref?: string;
  engine?: InferenceServiceEngine;
}

export interface CreateInferenceServiceRequest extends CreateInferenceServiceInput {
  idempotency_key: string;
}

export interface UpdateInferenceServiceInput {
  replicas: number;
}

export interface UpdateInferenceServiceRequest extends UpdateInferenceServiceInput {
  idempotency_key: string;
}

export interface InferenceServiceLifecycleInput {
  action: "start" | "stop" | "restart";
}

export interface InferenceServiceLifecycleRequest extends InferenceServiceLifecycleInput {
  idempotency_key: string;
}

export interface InferenceOperation {
  id: string;
  idempotency_key: string;
  task_type: string;
  resource_type: string;
  resource_id?: string | null;
  status: string;
  attempt_count: number;
  progress_pct: number;
  error_message?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
}

export interface InferenceServiceLog {
  timestamp?: string | null;
  level: string;
  message: string;
  container?: string | null;
  stream?: string | null;
}

export interface InferenceServiceLogListParams {
  limit?: number;
  cursor?: string;
  level?: "debug" | "info" | "warn" | "error";
}

export interface InferenceServiceLogListResponse {
  items: InferenceServiceLog[];
  next_cursor?: string | null;
}

export interface InferenceAccessPolicy {
  id: string;
  tenant_id: string;
  name: string;
  status: "enabled" | "disabled";
  description?: string | null;
  priority: number;
  scope: {
    type: "tenant_default" | "inference_service" | "api_key" | "inference_service_api_key";
    inference_service_ids?: string[];
    api_key_ids?: string[];
  };
  access: {
    allow_all_tenant_keys: boolean;
    allow_api_key_ids?: string[];
    deny_api_key_ids?: string[];
  };
  rate_limits: { qps?: number | null; rpm?: number | null };
  concurrency: { max_in_flight?: number | null; lease_ttl_seconds?: number };
  created_at: string;
  updated_at?: string | null;
}

export interface InferenceServicePolicies {
  service_id: string;
  policies: InferenceAccessPolicy[];
}
