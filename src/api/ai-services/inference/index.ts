import { runIdempotentRequest } from "@/api/idempotency";
import { servicesRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateInferenceServiceInput,
  CreateInferenceServiceRequest,
  InferenceOperation,
  InferenceService,
  InferenceServiceLifecycleInput,
  InferenceServiceLifecycleRequest,
  InferenceServiceListParams,
  InferenceServiceListResponse,
  InferenceServiceLogListParams,
  InferenceServiceLogListResponse,
  InferenceServicePolicies,
  UpdateInferenceServiceInput,
  UpdateInferenceServiceRequest,
} from "./types";

const servicePath = (serviceId: string) => `/inference-services/${encodeURIComponent(serviceId)}`;
const createScope = createIdempotencyScope("inference-service-create", ["POST"]);
const updateScope = createIdempotencyScope("inference-service-update", ["PATCH"]);
const lifecycleScope = createIdempotencyScope("inference-service-lifecycle", ["POST"]);

export function listInferenceServices(
  params: InferenceServiceListParams = {},
): Promise<InferenceServiceListResponse> {
  return servicesRequest<InferenceServiceListResponse>("/inference-services", {
    method: "GET",
    params,
  });
}

export function createInferenceService(
  submitData: CreateInferenceServiceInput,
): Promise<InferenceService> {
  return runIdempotentRequest(createScope, submitData, (body) =>
    servicesRequest<InferenceService, CreateInferenceServiceRequest>("/inference-services", {
      method: "POST",
      data: body,
    }),
  );
}

export function getInferenceService(serviceId: string): Promise<InferenceService> {
  return servicesRequest<InferenceService>(servicePath(serviceId), { method: "GET" });
}

export function updateInferenceService(
  serviceId: string,
  submitData: UpdateInferenceServiceInput,
): Promise<InferenceOperation> {
  return runIdempotentRequest(
    updateScope,
    submitData,
    (body) =>
      servicesRequest<InferenceOperation, UpdateInferenceServiceRequest>(servicePath(serviceId), {
        method: "PATCH",
        data: body,
      }),
    [serviceId],
  );
}

export function deleteInferenceService(serviceId: string): Promise<InferenceOperation> {
  return servicesRequest<InferenceOperation>(servicePath(serviceId), { method: "DELETE" });
}

export function applyInferenceServiceLifecycle(
  serviceId: string,
  submitData: InferenceServiceLifecycleInput,
): Promise<InferenceOperation> {
  return runIdempotentRequest(
    lifecycleScope,
    submitData,
    (body) =>
      servicesRequest<InferenceOperation, InferenceServiceLifecycleRequest>(
        `${servicePath(serviceId)}/lifecycle`,
        { method: "POST", data: body },
      ),
    [serviceId],
  );
}

export function listInferenceServiceLogs(
  serviceId: string,
  params: InferenceServiceLogListParams = {},
): Promise<InferenceServiceLogListResponse> {
  return servicesRequest<InferenceServiceLogListResponse>(`${servicePath(serviceId)}/logs`, {
    method: "GET",
    params,
  });
}

export function listInferenceServicePolicies(serviceId: string): Promise<InferenceServicePolicies> {
  return servicesRequest<InferenceServicePolicies>(`${servicePath(serviceId)}/policies`, {
    method: "GET",
  });
}

export type {
  CreateInferenceServiceInput,
  CreateInferenceServiceRequest,
  InferenceAccessPolicy,
  InferenceOperation,
  InferenceService,
  InferenceServiceAccelerator,
  InferenceServiceEngine,
  InferenceServiceLifecycleInput,
  InferenceServiceLifecycleRequest,
  InferenceServiceListParams,
  InferenceServiceListResponse,
  InferenceServiceLog,
  InferenceServiceLogListParams,
  InferenceServiceLogListResponse,
  InferenceServicePolicies,
  InferenceServiceResources,
  UpdateInferenceServiceInput,
  UpdateInferenceServiceRequest,
} from "./types";
