import { coreApi } from '@/api/client'
import { newIdempotencyKey } from '@/lib/idempotency'
import type { components } from '@/api/core-schema'

type StorageObject = components['schemas']['StorageObject']

export async function uploadStorageObjectFile(input: {
  bucketId: string
  file: File
  idempotencyKey?: string
}): Promise<StorageObject> {
  const { data, error } = await coreApi.POST('/objects/upload', {
    body: {
      bucket_id: input.bucketId,
      key: input.file.name,
      content_type: input.file.type || 'application/octet-stream',
      idempotency_key: input.idempotencyKey ?? newIdempotencyKey(),
    },
  })
  if (error) throw error
  if (!data?.upload_url || !data.object_id) {
    throw new Error('上传地址无效')
  }

  const uploadResponse = await fetch(data.upload_url, {
    method: 'PUT',
    body: input.file,
    headers: input.file.type ? { 'Content-Type': input.file.type } : undefined,
  })
  if (!uploadResponse.ok) {
    throw new Error(`对象上传失败：HTTP ${uploadResponse.status}`)
  }

  const { data: completed, error: completeError } = await coreApi.POST('/objects/{object_id}/complete', {
    params: { path: { object_id: data.object_id } },
    body: { idempotency_key: newIdempotencyKey() },
  })
  if (completeError) throw completeError
  if (!completed) {
    throw new Error('上传完成确认失败')
  }
  return completed
}
