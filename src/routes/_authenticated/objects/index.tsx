import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, Message, Modal, Select } from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { CursorTable } from '@/components/tables/CursorTable'
import { newIdempotencyKey } from '@/lib/idempotency'
import { showApiError } from '@/api/helpers'
import { listOrThrow } from '@/lib/api-list'
import { formatDateTime } from '@/lib/format'
import { bucketNamePattern } from '@/lib/validators'
import type { components } from '@/api/core-schema'

type Bucket = components['schemas']['StorageBucketRecord']

export const Route = createFileRoute('/_authenticated/objects/')({
  component: ObjectsPage,
})

function ObjectsPage() {
  const qc = useQueryClient()
  const [bucketVisible, setBucketVisible] = useState(false)
  const [bucketName, setBucketName] = useState('')
  const [bucketRegion, setBucketRegion] = useState('')
  const [bucketAccessMode, setBucketAccessMode] = useState<'private' | 'public_read'>('private')

  const { data, isLoading, error } = useQuery({
    queryKey: ['buckets'],
    queryFn: () => listOrThrow(() => coreApi.GET('/buckets', { params: { query: { limit: 50 } } })),
  })

  const createBucket = useMutation({
    mutationFn: async () => {
      if (!bucketNamePattern.test(bucketName)) {
        throw new Error('存储桶名称需为 3-63 位小写字母、数字或连字符，且首尾必须是字母或数字')
      }
      const { error } = await coreApi.POST('/buckets', {
        body: {
          name: bucketName,
          region: bucketRegion || undefined,
          access_mode: bucketAccessMode,
          idempotency_key: newIdempotencyKey(),
        },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setBucketVisible(false)
      setBucketName('')
      setBucketRegion('')
      setBucketAccessMode('private')
      qc.invalidateQueries({ queryKey: ['buckets'] })
    },
    onError: (e) => showApiError(e),
  })

  const items = (data?.items ?? []) as Bucket[]

  return (
    <div className="space-y-4">
      <PageHeader
        title="对象存储"
        subtitle="S3 兼容存储桶"
        extra={
          <Button type="primary" onClick={() => setBucketVisible(true)}>
            创建存储桶
          </Button>
        }
      />
      <CursorTable
        columns={[
          {
            title: '名称',
            render: (_, r) => (
              <Link to="/objects/$bucketId" params={{ bucketId: r.id }} className="text-inherit">
                {r.name}
              </Link>
            ),
          },
          { title: '访问模式', dataIndex: 'access_mode' },
          { title: '对象数', dataIndex: 'object_count' },
          { title: '创建时间', render: (_, r) => formatDateTime(r.created_at) },
        ]}
        data={{ items, next_cursor: data?.next_cursor }}
        loading={isLoading}
        error={error}
        rowKey="id"
        emptyDescription="暂无存储桶，点击右上角创建"
      />
      <Modal
        visible={bucketVisible}
        title="创建存储桶"
        onCancel={() => setBucketVisible(false)}
        onOk={() => createBucket.mutateAsync().catch((e) => Message.error(e instanceof Error ? e.message : '创建失败'))}
        confirmLoading={createBucket.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="名称" required>
            <Input value={bucketName} onChange={setBucketName} />
          </Form.Item>
          <Form.Item label="Region">
            <Input value={bucketRegion} onChange={setBucketRegion} placeholder="可选" />
          </Form.Item>
          <Form.Item label="访问模式">
            <Select value={bucketAccessMode} onChange={setBucketAccessMode}>
              <Select.Option value="private">private</Select.Option>
              <Select.Option value="public_read">public_read</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
