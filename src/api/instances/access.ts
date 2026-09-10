import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import { instancePath } from "./records";
import type {
  CreateInstanceExecSessionInput,
  InstanceConsoleSession,
  InstanceExecSession,
} from "./types";

const execScope = createIdempotencyScope("instance-exec-session", ["POST"]);
const consoleScope = createIdempotencyScope("instance-console-session", ["POST"]);
export function createInstanceExecSession(
  instanceId: string,
  submitData: CreateInstanceExecSessionInput,
  signal?: AbortSignal,
): Promise<InstanceExecSession> {
  return runIdempotentRequest(
    execScope,
    submitData,
    (body) =>
      coreRequest<InstanceExecSession, typeof body>(`${instancePath(instanceId)}/exec`, {
        method: "POST",
        data: body,
        signal,
      }),
    [instanceId],
  );
}
export function createInstanceConsoleSession(
  instanceId: string,
  protocol: "console" | "vnc" | "novnc" | "serial",
  signal?: AbortSignal,
): Promise<InstanceConsoleSession> {
  const submitData = { protocol };
  return runIdempotentRequest(
    consoleScope,
    submitData,
    (body) =>
      coreRequest<InstanceConsoleSession, typeof body>(`${instancePath(instanceId)}/console`, {
        method: "POST",
        data: body,
        signal,
      }),
    [instanceId],
  );
}
