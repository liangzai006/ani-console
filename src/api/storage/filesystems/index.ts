import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import type { AsyncTask } from "@/api/tasks";
import type { CursorPageParams } from "@/api/types";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateFilesystemMountTargetInput,
  CreateFilesystemMountTargetRequest,
  CreateStorageFilesystemInput,
  CreateStorageFilesystemRequest,
  FilesystemMountTargetListResponse,
  StorageFilesystem,
  StorageFilesystemExpandInput,
  StorageFilesystemExpandRequest,
  StorageFilesystemListParams,
  StorageFilesystemListResponse,
} from "./types";

const createScope = createIdempotencyScope("storage-filesystem-create", ["POST"]);
const mountTargetScope = createIdempotencyScope("storage-filesystem-mount-target-create", ["POST"]);
const expandScope = createIdempotencyScope("storage-filesystem-expand", ["POST"]);
const filesystemPath = (filesystemId: string) => `/filesystems/${encodeURIComponent(filesystemId)}`;

export function listFilesystems(
  params: StorageFilesystemListParams = {},
): Promise<StorageFilesystemListResponse> {
  return coreRequest<StorageFilesystemListResponse>("/filesystems", { method: "GET", params });
}

export function createFilesystem(
  submitData: CreateStorageFilesystemInput,
): Promise<StorageFilesystem> {
  return runIdempotentRequest(createScope, submitData, (body) =>
    coreRequest<StorageFilesystem, CreateStorageFilesystemRequest>("/filesystems", {
      method: "POST",
      data: body,
    }),
  );
}

export function getFilesystem(filesystemId: string): Promise<StorageFilesystem> {
  return coreRequest<StorageFilesystem>(filesystemPath(filesystemId), { method: "GET" });
}

export function deleteFilesystem(filesystemId: string): Promise<StorageFilesystem> {
  return coreRequest<StorageFilesystem>(filesystemPath(filesystemId), { method: "DELETE" });
}

export function listFilesystemMountTargets(
  filesystemId: string,
  params: CursorPageParams = {},
): Promise<FilesystemMountTargetListResponse> {
  return coreRequest<FilesystemMountTargetListResponse>(
    `${filesystemPath(filesystemId)}/mount-targets`,
    { method: "GET", params },
  );
}

export function createFilesystemMountTarget(
  filesystemId: string,
  submitData: CreateFilesystemMountTargetInput,
): Promise<AsyncTask> {
  return runIdempotentRequest(
    mountTargetScope,
    submitData,
    (body) =>
      coreRequest<AsyncTask, CreateFilesystemMountTargetRequest>(
        `${filesystemPath(filesystemId)}/mount-targets`,
        { method: "POST", data: body },
      ),
    [filesystemId],
  );
}

export function expandFilesystem(
  filesystemId: string,
  submitData: StorageFilesystemExpandInput,
): Promise<AsyncTask> {
  return runIdempotentRequest(
    expandScope,
    submitData,
    (body) =>
      coreRequest<AsyncTask, StorageFilesystemExpandRequest>(
        `${filesystemPath(filesystemId)}/expand`,
        { method: "POST", data: body },
      ),
    [filesystemId],
  );
}

export type {
  CreateFilesystemMountTargetInput,
  CreateFilesystemMountTargetRequest,
  CreateStorageFilesystemInput,
  CreateStorageFilesystemRequest,
  FilesystemMountTarget,
  FilesystemMountTargetListResponse,
  StorageFilesystem,
  StorageFilesystemExpandInput,
  StorageFilesystemExpandRequest,
  StorageFilesystemListParams,
  StorageFilesystemListResponse,
} from "./types";
