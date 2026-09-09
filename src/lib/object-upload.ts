import { coreApi } from "@/api/client";
import type { IdempotencyScope } from "@/lib/idempotency";
import type { components } from "@/api/core-schema";

type StorageObject = components["schemas"]["StorageObject"];

export async function uploadStorageObjectFile(input: {
  bucketId: string;
  file: File;
  prefix?: string;
  reservationScope: IdempotencyScope;
  completeScope: IdempotencyScope;
}): Promise<StorageObject> {
  const key =
    input.prefix && input.prefix !== "/" ? `${input.prefix}${input.file.name}` : input.file.name;
  const reservationDependencies = [
    input.bucketId,
    key,
    input.file.size,
    input.file.type,
    input.file.lastModified,
  ] as const;
  const reservationData = {
    bucket_id: input.bucketId,
    key,
    content_type: input.file.type || "application/octet-stream",
  };
  const { data, error } = await coreApi.POST("/objects/upload", {
    body: input.reservationScope.withKey(reservationData, reservationDependencies),
  });
  if (error) throw error;
  if (!data?.upload_url || !data.object_id) {
    throw new Error("上传地址无效");
  }

  const uploadResponse = await fetch(data.upload_url, {
    method: "PUT",
    body: input.file,
    headers: input.file.type ? { "Content-Type": input.file.type } : undefined,
  });
  if (!uploadResponse.ok) {
    throw new Error(`对象上传失败：HTTP ${uploadResponse.status}`);
  }

  const completeDependencies = [data.object_id] as const;
  const completeData = {};
  const { data: completed, error: completeError } = await coreApi.POST(
    "/objects/{object_id}/complete",
    {
      params: { path: { object_id: data.object_id } },
      body: input.completeScope.withKey(completeData, completeDependencies),
    },
  );
  if (completeError) throw completeError;
  if (!completed) {
    throw new Error("上传完成确认失败");
  }
  input.reservationScope.reset(reservationDependencies);
  input.completeScope.reset(completeDependencies);
  return completed;
}
