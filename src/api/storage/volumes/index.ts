import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import type { AsyncTask } from "@/api/tasks";
import type { CursorPageParams } from "@/api/types";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateStorageVolumeInput,
  CreateStorageVolumeRequest,
  CreateVolumeSnapshotInput,
  CreateVolumeSnapshotRequest,
  StorageVolume,
  StorageVolumeExpandInput,
  StorageVolumeExpandRequest,
  StorageVolumeListParams,
  StorageVolumeListResponse,
  VolumeOSInitCompleteInput,
  VolumeOSInitCompleteRequest,
  VolumeOSInitGuide,
  VolumeSnapshotListResponse,
} from "./types";

const createScope = createIdempotencyScope("storage-volume-create", ["POST"]);
const expandScope = createIdempotencyScope("storage-volume-expand", ["POST"]);
const snapshotScope = createIdempotencyScope("storage-volume-snapshot-create", ["POST"]);
const osInitScope = createIdempotencyScope("storage-volume-os-init-complete", ["POST"]);
const volumePath = (volumeId: string) => `/volumes/${encodeURIComponent(volumeId)}`;

export function listVolumes(
  params: StorageVolumeListParams = {},
): Promise<StorageVolumeListResponse> {
  return coreRequest<StorageVolumeListResponse>("/volumes", { method: "GET", params });
}

export function createVolume(submitData: CreateStorageVolumeInput): Promise<StorageVolume> {
  return runIdempotentRequest(createScope, submitData, (body) =>
    coreRequest<StorageVolume, CreateStorageVolumeRequest>("/volumes", {
      method: "POST",
      data: body,
    }),
  );
}

export function getVolume(volumeId: string): Promise<StorageVolume> {
  return coreRequest<StorageVolume>(volumePath(volumeId), { method: "GET" });
}

export function deleteVolume(volumeId: string): Promise<StorageVolume> {
  return coreRequest<StorageVolume>(volumePath(volumeId), { method: "DELETE" });
}

export function listVolumeSnapshots(
  volumeId: string,
  params: CursorPageParams = {},
): Promise<VolumeSnapshotListResponse> {
  return coreRequest<VolumeSnapshotListResponse>(`${volumePath(volumeId)}/snapshots`, {
    method: "GET",
    params,
  });
}

export function createVolumeSnapshot(
  volumeId: string,
  submitData: CreateVolumeSnapshotInput,
): Promise<AsyncTask> {
  return runIdempotentRequest(
    snapshotScope,
    submitData,
    (body) =>
      coreRequest<AsyncTask, CreateVolumeSnapshotRequest>(`${volumePath(volumeId)}/snapshots`, {
        method: "POST",
        data: body,
      }),
    [volumeId],
  );
}

export function expandVolume(
  volumeId: string,
  submitData: StorageVolumeExpandInput,
): Promise<AsyncTask> {
  return runIdempotentRequest(
    expandScope,
    submitData,
    (body) =>
      coreRequest<AsyncTask, StorageVolumeExpandRequest>(`${volumePath(volumeId)}/expand`, {
        method: "POST",
        data: body,
      }),
    [volumeId],
  );
}

export function getVolumeOSInitGuide(volumeId: string): Promise<VolumeOSInitGuide> {
  return coreRequest<VolumeOSInitGuide>(`${volumePath(volumeId)}/os-init-guide`, {
    method: "GET",
  });
}

export function completeVolumeOSInit(
  volumeId: string,
  submitData: VolumeOSInitCompleteInput,
): Promise<StorageVolume> {
  return runIdempotentRequest(
    osInitScope,
    submitData,
    (body) =>
      coreRequest<StorageVolume, VolumeOSInitCompleteRequest>(
        `${volumePath(volumeId)}/os-init-complete`,
        { method: "POST", data: body },
      ),
    [volumeId],
  );
}

export type {
  CreateStorageVolumeInput,
  CreateStorageVolumeRequest,
  CreateVolumeSnapshotInput,
  CreateVolumeSnapshotRequest,
  StorageResourceState,
  StorageVolume,
  StorageVolumeAutoSnapshotPolicy,
  StorageVolumeExpandInput,
  StorageVolumeExpandRequest,
  StorageVolumeListParams,
  StorageVolumeListResponse,
  VolumeOSInitCompleteInput,
  VolumeOSInitCompleteRequest,
  VolumeOSInitGuide,
  VolumeOSInitStep,
  VolumeSnapshotListResponse,
  VolumeSnapshotRecord,
} from "./types";
