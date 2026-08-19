import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, InputNumber, Modal } from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { StatusTag } from '@/components/shell/StatusTag'
import { CursorTable } from '@/components/tables/CursorTable'
import { newIdempotencyKey } from '@/lib/idempotency'
import { showApiError } from '@/api/helpers'
import { listOrThrow } from '@/lib/api-list'
import { formatDateTime } from '@/lib/format'
import type { components } from '@/api/core-schema'

type Volume = components['schemas']['StorageVolume']

export const Route = createFileRoute('/_authenticated/volumes/')({
  component: VolumesPage,
})

function VolumesPage() {
  const qc = useQueryClient()
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')
  const [sizeGiB, setSizeGiB] = useState(100)
  const [storageClass, setStorageClass] = useState('local')

  const { data, isLoading, error } = useQuery({
    queryKey: ['volumes'],
    queryFn: () => listOrThrow(() => coreApi.GET('/volumes', { params: { query: { limit: 50 } } })),
  })

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.POST('/volumes', {
        body: { name, size_gib: sizeGiB, storage_class: storageClass, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setVisible(false)
      setName('')
      setSizeGiB(100)
      setStorageClass('local')
      qc.invalidateQueries({ queryKey: ['volumes'] })
    },
    onError: (e) => showApiError(e),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await coreApi.DELETE('/volumes/{volume_id}', { params: { path: { volume_id: id } } })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['volumes'] }),
    onError: (e) => showApiError(e),
  })

  const items = (data?.items ?? []) as Volume[]

  return (
    <div className="space-y-4">
      <PageHeader
        title="块存储卷"
        extra={<Button type="primary" onClick={() => setVisible(true)}>创建</Button>}
      />
      <CursorTable<Volume>
        columns={[
          {
            title: '名称',
            render: (_, r) => (
              <Link to="/volumes/$volumeId" params={{ volumeId: r.id }} className="text-inherit">
                {r.name ?? r.id}
              </Link>
            ),
          },
          { title: '容量 (GiB)', dataIndex: 'size_gib' },
          { title: '存储类', dataIndex: 'storage_class' },
          { title: '状态', render: (_, r) => <StatusTag status={r.state} /> },
          { title: '创建时间', render: (_, r) => formatDateTime(r.created_at) },
          {
            title: '操作',
            render: (_, r) => (
              <Button
                type="text"
                status="danger"
                onClick={() =>
                  Modal.confirm({
                    title: '删除块存储卷',
                    content: `确定删除「${r.name ?? r.id}」？此操作不可恢复。`,
                    onOk: () => remove.mutateAsync(r.id),
                  })
                }
              >
                删除
              </Button>
            ),
          },
        ]}
        data={{ items, next_cursor: data?.next_cursor }}
        loading={isLoading}
        error={error}
        rowKey="id"
        emptyDescription="暂无块存储卷，点击右上角创建"
      />
      <Modal visible={visible} title="创建卷" onCancel={() => setVisible(false)} onOk={() => create.mutateAsync()} confirmLoading={create.isPending}>
        <Form layout="vertical">
          <Form.Item label="名称" required>
            <Input value={name} onChange={setName} />
          </Form.Item>
          <Form.Item label="容量 (GiB)" required>
            <InputNumber value={sizeGiB} min={1} precision={0} onChange={(value) => setSizeGiB(Number(value ?? 1))} />
          </Form.Item>
          <Form.Item label="存储类型">
            <Input value={storageClass} onChange={setStorageClass} placeholder="local" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
