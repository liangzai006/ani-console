import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateInstanceInput,
  CreateInstanceRequest,
  CreateInstanceResponse,
  InstanceListParams,
  InstanceListResponse,
  InstanceRecord,
} from "./types";

const createScope = createIdempotencyScope("instance-create", ["POST"]);
export const instancePath = (instanceId: string) => `/instances/${encodeURIComponent(instanceId)}`;
export function listInstances(params: InstanceListParams = {}): Promise<InstanceListResponse> {
  return coreRequest<InstanceListResponse>("/instances", { method: "GET", params });
}
export function getInstance(instanceId: string): Promise<InstanceRecord> {
  return coreRequest<InstanceRecord>(instancePath(instanceId), { method: "GET" });
}
export function createInstance(submitData: CreateInstanceInput): Promise<CreateInstanceResponse> {
  return runIdempotentRequest(createScope, submitData, (body) =>
    coreRequest<CreateInstanceResponse, CreateInstanceRequest>("/instances", {
      method: "POST",
      data: body,
    }),
  );
}
