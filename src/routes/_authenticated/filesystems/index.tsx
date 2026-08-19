import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, InputNumber, Modal, Select, Space } from '@arco-design/web-react'
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

type Filesystem = components['schemas']['StorageFilesystem']

export const Route = createFileRoute('/_authenticated/filesystems/')({
  component: FilesystemsPage,
})

function FilesystemsPage() {
  const qc = useQueryClient()
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')
  const [protocol, setProtocol] = useState<'nfs' | 'cephfs'>('nfs')
  const [sizeGiB, setSizeGiB] = useState(100)

  const { data, isLoading, error } = useQuery({
    queryKey: ['filesystems'],
    queryFn: () => listOrThrow(() => coreApi.GET('/filesystems', { params: { query: { limit: 50 } } })),
  })

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.POST('/filesystems', {
        body: { name, protocol, size_gib: sizeGiB, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setVisible(false)
      setName('')
      setProtocol('nfs')
      setSizeGiB(100)
      qc.invalidateQueries({ queryKey: ['filesystems'] })
    },
    onError: (e) => showApiError(e),
  })

  const deleteFilesystem = useMutation({
    mutationFn: async (filesystemId: string) => {
      const { error } = await coreApi.DELETE('/filesystems/{filesystem_id}', {
        params: { path: { filesystem_id: filesystemId } },
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['filesystems'] }),
    onError: (e) => showApiError(e),
  })

  const items = (data?.items ?? []) as Filesystem[]

  return (
    <div className="space-y-4">
      <PageHeader title="文件存储" extra={<Button type="primary" onClick={() => setVisible(true)}>创建</Button>} />
      <CursorTable<Filesystem>
        columns={[
          {
            title: '名称',
            render: (_, r) => (
              <Link to="/filesystems/$filesystemId" params={{ filesystemId: r.id }} className="text-inherit">
                {r.name ?? r.id}
              </Link>
            ),
          },
          { title: '协议', dataIndex: 'protocol' },
          { title: '容量 (GiB)', dataIndex: 'size_gib' },
          { title: '挂载端点', render: (_, r) => r.endpoint ?? '—' },
          { title: '状态', render: (_, r) => <StatusTag status={r.state} /> },
          { title: '创建时间', render: (_, r) => formatDateTime(r.created_at) },
          {
            title: '操作',
            render: (_, r) => (
              <Space>
                <Button
                  type="text"
                  status="danger"
                  onClick={() =>
                    Modal.confirm({
                      title: '删除文件系统',
                      content: `确定删除「${r.name ?? r.id}」？`,
                      onOk: () => deleteFilesystem.mutateAsync(r.id),
                    })
                  }
                >
                  删除
                </Button>
              </Space>
            ),
          },
        ]}
        data={{ items, next_cursor: data?.next_cursor }}
        loading={isLoading}
        error={error}
        rowKey="id"
        emptyDescription="暂无文件系统，点击右上角创建"
      />
      <Modal visible={visible} title="创建文件系统" onCancel={() => setVisible(false)} onOk={() => create.mutateAsync()} confirmLoading={create.isPending}>
        <Form layout="vertical">
          <Form.Item label="名称" required>
            <Input value={name} onChange={setName} />
          </Form.Item>
          <Form.Item label="协议">
            <Select value={protocol} onChange={setProtocol}>
              <Select.Option value="nfs">nfs</Select.Option>
              <Select.Option value="cephfs">cephfs</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="容量 (GiB)" required>
            <InputNumber value={sizeGiB} min={1} precision={0} onChange={(value) => setSizeGiB(Number(value ?? 1))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
