import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Descriptions, Modal, Space, Spin } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { StatusTag } from '@/components/shell/StatusTag'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'
import { showApiError } from '@/api/helpers'
import { formatDateTime } from '@/lib/format'
import { newIdempotencyKey } from '@/lib/idempotency'

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
      const { data, error } = await coreApi.GET('/objects/{object_id}', {
        params: { path: { object_id: objectId } },
      })
      if (error) throw error
      return data
    },
  })

  const completeUpload = useMutation({
    mutationFn: async () => {
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
    onError: (e) => showApiError(e),
  })

  const downloadObject = useMutation({
    mutationFn: async () => {
      const { data, error } = await coreApi.GET('/objects/{object_id}/download', {
        params: { path: { object_id: objectId } },
      })
      if (error) throw error
      if (data?.download_url) window.open(data.download_url, '_blank')
    },
    onError: (e) => showApiError(e),
  })

  const deleteObject = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.DELETE('/objects/{object_id}', {
        params: { path: { object_id: objectId } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objects', bucketId] })
      qc.invalidateQueries({ queryKey: ['bucket-objects', bucketId] })
      navigate({ to: '/objects/$bucketId', params: { bucketId } })
    },
    onError: (e) => showApiError(e),
  })

  if (detail.isLoading && !detail.data) {
    return (
      <div className="space-y-5">
        <PageHeader title="对象详情" subtitle="加载中…" />
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      </div>
    )
  }

  if (detail.error) return <ApiErrorAlert error={detail.error} />

  const object = detail.data

  return (
    <div className="space-y-5">
      <PageHeader
        title={object?.key ?? objectId}
        subtitle="对象详情"
        extra={
          <Space wrap>
            {object?.state === 'pending' ? (
              <Button type="primary" loading={completeUpload.isPending} onClick={() => completeUpload.mutateAsync()}>
                确认上传完成
              </Button>
            ) : null}
            <Button
              type="outline"
              loading={downloadObject.isPending}
              disabled={object?.state === 'pending'}
              onClick={() => downloadObject.mutateAsync()}
            >
              下载
            </Button>
            <Button
              type="outline"
              status="danger"
              onClick={() =>
                Modal.confirm({
                  title: '删除对象',
                  content: `确定删除对象「${object?.key ?? objectId}」？`,
                  okButtonProps: { status: 'danger' },
                  onOk: () => deleteObject.mutateAsync(),
                })
              }
            >
              删除
            </Button>
            <Button type="text" onClick={() => navigate({ to: '/objects/$bucketId', params: { bucketId } })}>
              返回存储桶
            </Button>
            <Link to="/objects">
              <Button type="text">返回列表</Button>
            </Link>
          </Space>
        }
      />
      <Card>
        <Descriptions
          column={{ xs: 1, sm: 2, md: 3 }}
          data={[
            { label: 'ID', value: object?.id },
            { label: 'Bucket', value: object?.bucket },
            { label: 'Key', value: object?.key },
            { label: '大小', value: object?.size_bytes },
            { label: '类型', value: object?.content_type },
            { label: '状态', value: <StatusTag status={object?.state} /> },
            { label: '创建时间', value: formatDateTime(object?.created_at) },
            { label: '更新时间', value: formatDateTime(object?.updated_at) },
          ]}
        />
      </Card>
    </div>
  )
}
