import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import { instancePath } from "./records";
import type {
  InstanceLifecycleInput,
  InstanceLifecycleRequest,
  InstanceLifecycleResponse,
} from "./types";
const lifecycleScope = createIdempotencyScope("instance-lifecycle", ["POST"]);
export function applyInstanceLifecycle(
  instanceId: string,
  submitData: InstanceLifecycleInput,
): Promise<InstanceLifecycleResponse> {
  return runIdempotentRequest(
    lifecycleScope,
    submitData,
    (body) =>
      coreRequest<InstanceLifecycleResponse, InstanceLifecycleRequest>(
        `${instancePath(instanceId)}/lifecycle`,
        { method: "POST", data: body },
      ),
    [instanceId, submitData.action],
  );
}
