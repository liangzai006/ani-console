import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest, externalAxios, toApiError } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  StorageObject,
  StorageObjectCompleteRequest,
  StorageObjectDownloadInfo,
  StorageObjectUploadInput,
  StorageObjectUploadRequest,
  StorageObjectUploadResponse,
  UploadStorageObjectFileInput,
} from "./types";

const reserveScope = createIdempotencyScope("storage-object-upload-reserve", ["POST"]);
const completeScope = createIdempotencyScope("storage-object-upload-complete", ["POST"]);
const objectPath = (objectId: string) => `/objects/${encodeURIComponent(objectId)}`;

export function reserveStorageObjectUpload(
  submitData: StorageObjectUploadInput,
  runtimeDependencies: readonly unknown[] = [],
): Promise<StorageObjectUploadResponse> {
  return runIdempotentRequest(
    reserveScope,
    submitData,
    (body) =>
      coreRequest<StorageObjectUploadResponse, StorageObjectUploadRequest>("/objects/upload", {
        method: "POST",
        data: body,
      }),
    runtimeDependencies,
  );
}

export function getStorageObject(objectId: string): Promise<StorageObject> {
  return coreRequest<StorageObject>(objectPath(objectId), { method: "GET" });
}

export function deleteStorageObject(objectId: string): Promise<StorageObject> {
  return coreRequest<StorageObject>(objectPath(objectId), { method: "DELETE" });
}

export function completeStorageObjectUpload(objectId: string): Promise<StorageObject> {
  return runIdempotentRequest(
    completeScope,
    {},
    (body) =>
      coreRequest<StorageObject, StorageObjectCompleteRequest>(`${objectPath(objectId)}/complete`, {
        method: "POST",
        data: body,
      }),
    [objectId],
  );
}

export function getStorageObjectDownload(
  objectId: string,
  expiresSeconds?: number,
): Promise<StorageObjectDownloadInfo> {
  return coreRequest<StorageObjectDownloadInfo>(`${objectPath(objectId)}/download`, {
    method: "GET",
    params: { expires_seconds: expiresSeconds },
  });
}

export async function uploadStorageObjectFile({
  bucketId,
  file,
  prefix,
  signal,
}: UploadStorageObjectFileInput): Promise<StorageObject> {
  const key = prefix && prefix !== "/" ? `${prefix}${file.name}` : file.name;
  const reservation = await reserveStorageObjectUpload(
    {
      bucket_id: bucketId,
      key,
      content_type: file.type || "application/octet-stream",
    },
    [bucketId, key, file.size, file.type, file.lastModified],
  );
  if (!reservation.upload_url || !reservation.object_id) throw new Error("上传地址无效");

  try {
    await externalAxios.put(reservation.upload_url, file, {
      signal,
      headers: file.type ? { "Content-Type": file.type } : undefined,
    });
  } catch (error) {
    throw toApiError(error);
  }

  return completeStorageObjectUpload(reservation.object_id);
}

export type {
  StorageObject,
  StorageObjectCompleteRequest,
  StorageObjectDownloadInfo,
  StorageObjectUploadInput,
  StorageObjectUploadRequest,
  StorageObjectUploadResponse,
  UploadStorageObjectFileInput,
} from "./types";
