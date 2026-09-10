import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type { AsyncTask } from "@/api/tasks";
import { instancePath } from "./records";
import type {
  CreateInstanceResponse,
  SandboxCheckpoint,
  SandboxFile,
  SandboxPort,
  SandboxTemplate,
  SandboxTokenResponse,
} from "./types";

const tokenScope = createIdempotencyScope("sandbox-token", ["POST"]);
const portScope = createIdempotencyScope("sandbox-port", ["POST"]);
const deletePortScope = createIdempotencyScope("sandbox-port-delete", ["DELETE"]);
const fileScope = createIdempotencyScope("sandbox-file", ["POST"]);
const deleteFileScope = createIdempotencyScope("sandbox-file-delete", ["DELETE"]);
const checkpointScope = createIdempotencyScope("sandbox-checkpoint", ["POST"]);
const restoreScope = createIdempotencyScope("sandbox-checkpoint-restore", ["POST"]);
const cloneScope = createIdempotencyScope("sandbox-checkpoint-clone", ["POST"]);
const codeScope = createIdempotencyScope("sandbox-code-run", ["POST"]);
type ListResponse<T> = { items: T[]; total: number; next_cursor?: string | null };
export function listSandboxTemplates(
  params: { limit?: number } = {},
): Promise<ListResponse<SandboxTemplate>> {
  return coreRequest<ListResponse<SandboxTemplate>>("/sandbox-templates", {
    method: "GET",
    params,
  });
}
export function createSandboxToken(
  instanceId: string,
  submitData: { expires_in?: string; scopes?: Array<"connect" | "exec" | "files" | "ports"> },
): Promise<SandboxTokenResponse> {
  return runIdempotentRequest(
    tokenScope,
    submitData,
    (body) =>
      coreRequest<SandboxTokenResponse, typeof body>(`${instancePath(instanceId)}/sandbox/tokens`, {
        method: "POST",
        data: body,
      }),
    [instanceId],
  );
}
export function createSandboxPort(
  instanceId: string,
  submitData: { port: number; name?: string | null; protocol?: "tcp" | "http" },
): Promise<SandboxPort> {
  return runIdempotentRequest(
    portScope,
    submitData,
    (body) =>
      coreRequest<SandboxPort, typeof body>(`${instancePath(instanceId)}/sandbox/ports`, {
        method: "POST",
        data: body,
      }),
    [instanceId],
  );
}
export function deleteSandboxPort(instanceId: string, port: number): Promise<void> {
  const submitData = {};
  return runIdempotentRequest(
    deletePortScope,
    submitData,
    ({ idempotency_key }) =>
      coreRequest<void>(`${instancePath(instanceId)}/sandbox/ports/${port}`, {
        method: "DELETE",
        headers: { "Idempotency-Key": idempotency_key },
      }),
    [instanceId, port],
  );
}
export function listSandboxFiles(
  instanceId: string,
  params: { path?: string; limit?: number } = {},
): Promise<ListResponse<SandboxFile>> {
  return coreRequest<ListResponse<SandboxFile>>(`${instancePath(instanceId)}/sandbox/files`, {
    method: "GET",
    params,
  });
}
export function writeSandboxFile(
  instanceId: string,
  submitData: { path: string; content_base64?: string; upload_id?: string; overwrite?: boolean },
): Promise<SandboxFile> {
  return runIdempotentRequest(
    fileScope,
    submitData,
    (body) =>
      coreRequest<SandboxFile, typeof body>(`${instancePath(instanceId)}/sandbox/files`, {
        method: "POST",
        data: body,
      }),
    [instanceId],
  );
}
export function deleteSandboxFile(instanceId: string, path: string): Promise<void> {
  const submitData = {};
  return runIdempotentRequest(
    deleteFileScope,
    submitData,
    ({ idempotency_key }) =>
      coreRequest<void>(`${instancePath(instanceId)}/sandbox/files`, {
        method: "DELETE",
        params: { path },
        headers: { "Idempotency-Key": idempotency_key },
      }),
    [instanceId, path],
  );
}
export function listSandboxCheckpoints(
  instanceId: string,
): Promise<ListResponse<SandboxCheckpoint>> {
  return coreRequest<ListResponse<SandboxCheckpoint>>(
    `${instancePath(instanceId)}/sandbox/checkpoints`,
    { method: "GET" },
  );
}
export function createSandboxCheckpoint(
  instanceId: string,
  submitData: { name: string; keep_memory?: boolean },
): Promise<AsyncTask> {
  return runIdempotentRequest(
    checkpointScope,
    submitData,
    (body) =>
      coreRequest<AsyncTask, typeof body>(`${instancePath(instanceId)}/sandbox/checkpoints`, {
        method: "POST",
        data: body,
      }),
    [instanceId],
  );
}
export function restoreSandboxCheckpoint(
  instanceId: string,
  checkpointId: string,
): Promise<AsyncTask> {
  const submitData = {};
  return runIdempotentRequest(
    restoreScope,
    submitData,
    (body) =>
      coreRequest<AsyncTask, typeof body>(
        `${instancePath(instanceId)}/sandbox/checkpoints/${encodeURIComponent(checkpointId)}/restore`,
        { method: "POST", data: body },
      ),
    [instanceId, checkpointId],
  );
}
export function cloneSandboxCheckpoint(
  instanceId: string,
  checkpointId: string,
  submitData: { name: string },
): Promise<CreateInstanceResponse> {
  return runIdempotentRequest(
    cloneScope,
    submitData,
    (body) =>
      coreRequest<CreateInstanceResponse, typeof body>(
        `${instancePath(instanceId)}/sandbox/checkpoints/${encodeURIComponent(checkpointId)}/clone`,
        { method: "POST", data: body },
      ),
    [instanceId, checkpointId],
  );
}
export function createSandboxCodeRun(
  instanceId: string,
  submitData: {
    language: "python" | "javascript";
    code: string;
    timeout_seconds?: number;
    stdin?: string | null;
  },
): Promise<AsyncTask> {
  return runIdempotentRequest(
    codeScope,
    submitData,
    (body) =>
      coreRequest<AsyncTask, typeof body>(`${instancePath(instanceId)}/sandbox/code-runs`, {
        method: "POST",
        data: body,
      }),
    [instanceId],
  );
}
