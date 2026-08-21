import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Modal, Space, Spin } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { DetailPageFrame } from '@/components/detailbase'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'
import { AliIcon } from '@/components/icons/AliIcon'
import { StatusTag } from '@/components/shell/StatusTag'
import { formatBytes, formatDateTime } from '@/lib/format'
import { newIdempotencyKey } from '@/lib/idempotency'

type StorageObject = components['schemas']['StorageObject']

export const Route = createFileRoute('/_authenticated/objects/$bucketId/$objectId')({
  component: ObjectDetailPage,
})

function ObjectDetailPage() {
  const { bucketId, objectId } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: ['object', objectId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/objects/{object_id}', { params: { path: { object_id: objectId } } })
      if (error) throw error
      return data
    },
  })
  const completeUpload = useMutation({
    mutationFn: async (_: undefined) => {
      const { data, error } = await coreApi.POST('/objects/{object_id}/complete', {
        params: { path: { object_id: objectId } },
        body: { idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['object', objectId] })
      qc.invalidateQueries({ queryKey: ['bucket-objects', bucketId] })
      qc.invalidateQueries({ queryKey: ['buckets'] })
    },
    onError: (error) => showApiError(error),
  })
  const downloadObject = useMutation({
    mutationFn: async (_: undefined) => {
      const { data, error } = await coreApi.GET('/objects/{object_id}/download', {
        params: { path: { object_id: objectId } },
      })
      if (error) throw error
      if (data?.download_url) window.open(data.download_url, '_blank')
    },
    onError: (error) => showApiError(error),
  })
  const deleteObject = useMutation({
    mutationFn: async (_: undefined) => {
      const { error } = await coreApi.DELETE('/objects/{object_id}', { params: { path: { object_id: objectId } } })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buckets'] })
      qc.invalidateQueries({ queryKey: ['bucket-objects', bucketId] })
      navigate({ to: '/objects/$bucketId', params: { bucketId } })
    },
    onError: (error) => showApiError(error),
  })

  if (detail.isLoading && !detail.data)
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    )
  if (detail.error || !detail.data)
    return <ApiErrorAlert error={detail.error ?? new Error('对象不存在或无权访问')} title="对象加载失败" />

  const object = detail.data as StorageObject

  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: '存储' },
        { label: '对象存储', to: '/objects' },
        { label: object.bucket, to: '/objects/$bucketId', params: { bucketId } },
        { label: object.key },
      ]}
      title={object.key}
      status={<StatusTag status={object.state} />}
      icon={<AliIcon name="file" size={28} />}
      headerItems={[
        { label: '对象 ID', value: object.id },
        { label: '大小', value: formatBytes(object.size_bytes) },
        { label: '创建时间', value: formatDateTime(object.created_at) },
      ]}
      actions={
        <Space wrap>
          {object.state === 'pending' ? (
            <Button type="primary" loading={completeUpload.isPending} onClick={() => completeUpload.mutateAsync(undefined)}>
              确认上传完成
            </Button>
          ) : null}
          <Button
            loading={downloadObject.isPending}
            disabled={object.state === 'pending'}
            onClick={() => downloadObject.mutateAsync(undefined)}
          >
            下载
          </Button>
          <Button
            status="danger"
            onClick={() =>
              Modal.confirm({
                title: '删除对象',
                content: `确定删除对象「${object.key}」？`,
                okButtonProps: { status: 'danger' },
                onOk: () => deleteObject.mutateAsync(undefined),
              })
            }
          >
            删除
          </Button>
        </Space>
      }
      cards={[
        {
          key: 'basic',
          title: '基本信息',
          fields: [
            { label: 'ID', value: object.id },
            { label: 'Bucket', value: object.bucket },
            { label: 'Key', value: object.key },
            { label: '大小', value: formatBytes(object.size_bytes) },
            { label: '类型', value: object.content_type },
            { label: '状态', value: <StatusTag status={object.state} /> },
            { label: '状态原因', value: object.reason || '—' },
            { label: '创建时间', value: formatDateTime(object.created_at) },
            { label: '更新时间', value: formatDateTime(object.updated_at) },
          ],
        },
      ]}
      onBack={() => navigate({ to: '/objects/$bucketId', params: { bucketId } })}
    />
  )
}
