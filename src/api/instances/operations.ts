import { coreRequest } from "@/api/request";
import { instancePath } from "./records";
import type { CursorPageParams } from "@/api/types";
import type { InstanceOperation, InstanceOperationListResponse } from "./types";
export function getInstanceOperation(operationId: string): Promise<InstanceOperation> {
  return coreRequest<InstanceOperation>(`/instance-operations/${encodeURIComponent(operationId)}`, {
    method: "GET",
  });
}
export function listInstanceOperations(
  instanceId: string,
  params: CursorPageParams = {},
): Promise<InstanceOperationListResponse> {
  return coreRequest<InstanceOperationListResponse>(`${instancePath(instanceId)}/operations`, {
    method: "GET",
    params,
  });
}
