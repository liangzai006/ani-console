import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Spin,
  Upload,
} from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { CursorTable } from '@/components/tables/CursorTable'
import { StatusTag } from '@/components/shell/StatusTag'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'
import { newIdempotencyKey } from '@/lib/idempotency'
import { showApiError } from '@/api/helpers'
import { listOrThrow } from '@/lib/api-list'
import { formatDateTime } from '@/lib/format'
import { uploadStorageObjectFile } from '@/lib/object-upload'
import type { components } from '@/api/core-schema'

type Bucket = components['schemas']['StorageBucketRecord']
type StorageObject = components['schemas']['StorageObject']

export const Route = createFileRoute('/_authenticated/objects/$bucketId/')({
  component: BucketDetailPage,
})

async function fetchBucketById(bucketId: string): Promise<Bucket> {
  const data = await listOrThrow(() => coreApi.GET('/buckets', { params: { query: { limit: 100 } } }))
  const bucket = (data.items ?? []).find((item) => item.id === bucketId)
  if (!bucket) throw new Error('存储桶不存在或无权访问')
  return bucket as Bucket
}

async function fetchObjectsInBucket(bucketName: string) {
  const data = await listOrThrow(() => coreApi.GET('/objects', { params: { query: { limit: 100 } } }))
  const items = ((data.items ?? []) as StorageObject[]).filter((item) => item.bucket === bucketName)
  return { items, next_cursor: data.next_cursor }
}

function BucketDetailPage() {
  const { bucketId } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [objectVisible, setObjectVisible] = useState(false)
  const [objectKey, setObjectKey] = useState('')
  const [objectSizeBytes, setObjectSizeBytes] = useState(0)
  const [objectContentType, setObjectContentType] = useState('application/octet-stream')

  const bucket = useQuery({
    queryKey: ['bucket', bucketId],
    queryFn: () => fetchBucketById(bucketId),
  })

  const bucketObjects = useQuery({
    queryKey: ['bucket-objects', bucketId, bucket.data?.name],
    queryFn: () => fetchObjectsInBucket(bucket.data!.name),
    enabled: !!bucket.data?.name,
  })

  const upload = useMutation({
    mutationFn: (file: File) => uploadStorageObjectFile({ bucketId, file }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bucket-objects', bucketId] })
      qc.invalidateQueries({ queryKey: ['buckets'] })
      qc.invalidateQueries({ queryKey: ['bucket', bucketId] })
    },
    onError: (e) => showApiError(e),
  })

  const createObject = useMutation({
    mutationFn: async () => {
      const bucketName = bucket.data?.name
      if (!bucketName) throw new Error('存储桶不存在')
      const { error } = await coreApi.POST('/objects', {
        body: {
          bucket: bucketName,
          key: objectKey,
          size_bytes: objectSizeBytes,
          content_type: objectContentType || 'application/octet-stream',
          idempotency_key: newIdempotencyKey(),
        },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setObjectVisible(false)
      setObjectKey('')
      setObjectSizeBytes(0)
      setObjectContentType('application/octet-stream')
      qc.invalidateQueries({ queryKey: ['bucket-objects', bucketId] })
      qc.invalidateQueries({ queryKey: ['buckets'] })
      qc.invalidateQueries({ queryKey: ['bucket', bucketId] })
    },
    onError: (e) => showApiError(e),
  })

  const downloadObject = useMutation({
    mutationFn: async (objectId: string) => {
      const { data, error } = await coreApi.GET('/objects/{object_id}/download', {
        params: { path: { object_id: objectId } },
      })
      if (error) throw error
      if (data?.download_url) window.open(data.download_url, '_blank')
    },
    onError: (e) => showApiError(e),
  })

  const deleteObject = useMutation({
    mutationFn: async (objectId: string) => {
      const { error } = await coreApi.DELETE('/objects/{object_id}', { params: { path: { object_id: objectId } } })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bucket-objects', bucketId] })
      qc.invalidateQueries({ queryKey: ['buckets'] })
      qc.invalidateQueries({ queryKey: ['bucket', bucketId] })
    },
    onError: (e) => showApiError(e),
  })

  if (bucket.isLoading && !bucket.data) {
    return (
      <div className="space-y-5">
        <PageHeader title="存储桶详情" subtitle="加载中…" />
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      </div>
    )
  }

  if (bucket.error) return <ApiErrorAlert error={bucket.error} title="存储桶加载失败" />

  const bucketInfo = bucket.data!
  const objectItems = bucketObjects.data?.items ?? []

  const openObjectDetail = (objectId: string) => {
    navigate({
      to: '/objects/$bucketId/$objectId',
      params: { bucketId, objectId },
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={bucketInfo.name}
        subtitle="存储桶详情"
        extra={
          <Space wrap>
            <Upload
              showUploadList={false}
              customRequest={(opt) => {
                upload.mutate(opt.file as File)
              }}
            >
              <Button type="outline" loading={upload.isPending}>
                上传对象
              </Button>
            </Upload>
            <Button type="outline" onClick={() => setObjectVisible(true)}>
              仅登记元数据
            </Button>
            <Button type="text" onClick={() => navigate({ to: '/objects' })}>
              返回列表
            </Button>
          </Space>
        }
      />
      <Card>
        <Descriptions
          column={{ xs: 1, sm: 2, md: 3 }}
          data={[
            { label: 'ID', value: bucketInfo.id },
            { label: '访问模式', value: bucketInfo.access_mode },
            { label: 'Region', value: bucketInfo.region ?? '—' },
            { label: '对象数', value: String(bucketInfo.object_count ?? objectItems.length) },
            { label: '总大小', value: bucketInfo.size_bytes != null ? String(bucketInfo.size_bytes) : '—' },
            { label: '创建时间', value: formatDateTime(bucketInfo.created_at) },
          ]}
        />
      </Card>
      <Card title="桶内对象">
        <CursorTable
          columns={[
            {
              title: 'Key',
              render: (_, r) => (
                <Button type="text" onClick={() => openObjectDetail(String(r.id))}>
                  {r.key ?? r.id}
                </Button>
              ),
            },
            { title: '大小', dataIndex: 'size_bytes' },
            { title: '类型', dataIndex: 'content_type' },
            { title: '状态', render: (_, r) => <StatusTag status={r.state} /> },
            {
              title: '操作',
              render: (_, r) => (
                <Space>
                  <Button type="text" onClick={() => openObjectDetail(String(r.id))}>
                    详情
                  </Button>
                  <Button
                    type="text"
                    disabled={r.state === 'pending'}
                    onClick={() => downloadObject.mutateAsync(String(r.id))}
                  >
                    下载
                  </Button>
                  <Button
                    type="text"
                    status="danger"
                    onClick={() =>
                      Modal.confirm({
                        title: '删除对象',
                        content: `确定删除对象「${String(r.key ?? r.id)}」？`,
                        onOk: () => deleteObject.mutateAsync(String(r.id)),
                      })
                    }
                  >
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
          data={{ items: objectItems, next_cursor: bucketObjects.data?.next_cursor }}
          loading={bucketObjects.isLoading}
          error={bucketObjects.error}
          rowKey="id"
          emptyDescription="当前存储桶暂无对象"
        />
      </Card>
      <Modal
        visible={objectVisible}
        title="仅登记对象元数据"
        onCancel={() => setObjectVisible(false)}
        onOk={() => createObject.mutateAsync()}
        confirmLoading={createObject.isPending}
      >
        <p className="mb-3 text-sm text-[var(--color-text-3)]">
          此操作只在控制面写入 PG 元数据，不会上传文件到 MinIO/S3。如需真实文件，请使用「上传对象」。
        </p>
        <Form layout="vertical">
          <Form.Item label="Bucket">
            <Input value={bucketInfo.name} disabled />
          </Form.Item>
          <Form.Item label="Key" required>
            <Input value={objectKey} onChange={setObjectKey} />
          </Form.Item>
          <Form.Item label="Size Bytes" required>
            <InputNumber
              value={objectSizeBytes}
              min={0}
              precision={0}
              onChange={(value) => setObjectSizeBytes(Number(value ?? 0))}
            />
          </Form.Item>
          <Form.Item label="Content Type" required>
            <Input value={objectContentType} onChange={setObjectContentType} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
