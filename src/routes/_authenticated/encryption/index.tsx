import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Descriptions, Empty, Form, Input, Modal, Select, Space } from '@arco-design/web-react'
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

type EncryptionKey = components['schemas']['EncryptionKey']
type EncryptionAlgorithm = components['schemas']['EncryptionKeyCreateRequest']['algorithm']

export const Route = createFileRoute('/_authenticated/encryption/')({ component: EncryptionPage })

function EncryptionPage() {
  const qc = useQueryClient()
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')
  const [algorithm, setAlgorithm] = useState<EncryptionAlgorithm>('SM4')
  const [sealKeyId, setSealKeyId] = useState('')
  const [sealObjectUri, setSealObjectUri] = useState('')
  const [unsealToken, setUnsealToken] = useState<string | null>(null)
  const [detailKey, setDetailKey] = useState<EncryptionKey | null>(null)
  const [revokeKey, setRevokeKey] = useState<EncryptionKey | null>(null)
  const [revokeReason, setRevokeReason] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['encryption-keys'],
    queryFn: () => listOrThrow(() => coreApi.GET('/encryption/keys', { params: { query: { limit: 50 } } })),
  })

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.POST('/encryption/keys', {
        body: { name, algorithm, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setVisible(false)
      setName('')
      setAlgorithm('SM4')
      qc.invalidateQueries({ queryKey: ['encryption-keys'] })
    },
    onError: (e) => showApiError(e),
  })

  const loadDetail = useMutation({
    mutationFn: async (keyId: string) => {
      const { data, error } = await coreApi.GET('/encryption/keys/{key_id}', {
        params: { path: { key_id: keyId } },
      })
      if (error) throw error
      setDetailKey(data ?? null)
    },
    onError: (e) => showApiError(e),
  })

  const deleteKey = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await coreApi.DELETE('/encryption/keys/{key_id}', {
        params: { path: { key_id: keyId } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setDetailKey(null)
      qc.invalidateQueries({ queryKey: ['encryption-keys'] })
    },
    onError: (e) => showApiError(e),
  })

  const rotate = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await coreApi.POST('/encryption/keys/{key_id}/rotate', {
        params: { path: { key_id: keyId } },
        body: { idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encryption-keys'] }),
    onError: (e) => showApiError(e),
  })

  const revoke = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await coreApi.POST('/encryption/keys/{key_id}/revoke', {
        params: { path: { key_id: keyId } },
        body: { reason: revokeReason.trim() || undefined, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setRevokeKey(null)
      setRevokeReason('')
      qc.invalidateQueries({ queryKey: ['encryption-keys'] })
    },
    onError: (e) => showApiError(e),
  })

  const seal = useMutation({
    mutationFn: async () => {
      const { data, error } = await coreApi.POST('/encryption/seal', {
        body: { key_id: sealKeyId, object_uri: sealObjectUri, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
      setUnsealToken(data?.unseal_token ?? null)
    },
    onError: (e) => showApiError(e),
  })

  const unseal = useMutation({
    mutationFn: async () => {
      const { data, error } = await coreApi.POST('/encryption/unseal-token', {
        body: { key_id: sealKeyId, sealed_object_uri: sealObjectUri, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
      setUnsealToken(data?.unseal_token ?? '—')
    },
    onError: (e) => showApiError(e),
  })

  const items = (data?.items ?? []) as EncryptionKey[]

  return (
    <div className="space-y-4">
      <PageHeader
        title="加密密钥"
        extra={
          <Button type="primary" onClick={() => setVisible(true)}>
            创建密钥
          </Button>
        }
      />
      <CursorTable<EncryptionKey>
        columns={[
          { title: '名称', render: (_, r) => r.name ?? r.id ?? '—' },
          { title: '算法', dataIndex: 'algorithm' },
          { title: '状态', render: (_, r) => <StatusTag status={r.state} /> },
          { title: '创建时间', render: (_, r) => formatDateTime(r.created_at) },
          {
            title: '操作',
            render: (_, r) => (
              <Space>
                <Button type="text" loading={loadDetail.isPending} onClick={() => loadDetail.mutateAsync(String(r.id))}>
                  详情
                </Button>
                <Button type="text" onClick={() => rotate.mutateAsync(String(r.id))}>
                  轮换
                </Button>
                <Button
                  type="text"
                  status="warning"
                  onClick={() => setRevokeKey(r)}
                >
                  吊销
                </Button>
                <Button
                  type="text"
                  status="danger"
                  onClick={() =>
                    Modal.confirm({
                      title: '删除密钥',
                      content: `确定删除「${r.name ?? r.id}」？`,
                      onOk: () => deleteKey.mutateAsync(String(r.id)),
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
        emptyDescription="暂无加密密钥，点击右上角创建"
      />
      <Card title="Seal / Unseal Token">
        <div className="space-y-4">
          <Form layout="vertical">
            <Form.Item label="Key ID">
              <Input value={sealKeyId} onChange={setSealKeyId} />
            </Form.Item>
            <Form.Item label="Object / Sealed URI">
              <Input value={sealObjectUri} onChange={setSealObjectUri} />
            </Form.Item>
          </Form>
          <Space>
            <Button onClick={() => seal.mutateAsync()} loading={seal.isPending}>
              Seal
            </Button>
            <Button type="primary" onClick={() => unseal.mutateAsync()} loading={unseal.isPending}>
              申请 Unseal Token
            </Button>
          </Space>
          {unsealToken ? (
            <Descriptions column={1} data={[{ label: 'Unseal Token', value: unsealToken }]} />
          ) : (
            <Empty description="填写参数后申请 Token" />
          )}
        </div>
      </Card>
      <Modal
        visible={visible}
        title="创建密钥"
        onCancel={() => setVisible(false)}
        onOk={() => create.mutateAsync()}
        confirmLoading={create.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="名称" required>
            <Input value={name} onChange={setName} />
          </Form.Item>
          <Form.Item label="算法">
            <Select value={algorithm} onChange={setAlgorithm}>
              <Select.Option value="SM4">SM4</Select.Option>
              <Select.Option value="AES256">AES256</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      <Modal visible={!!detailKey} title="密钥详情" footer={null} onCancel={() => setDetailKey(null)}>
        <Descriptions
          column={1}
          data={[
            { label: 'ID', value: detailKey?.id },
            { label: '名称', value: detailKey?.name },
            { label: '算法', value: detailKey?.algorithm },
            { label: '状态', value: detailKey?.state },
            { label: '创建时间', value: formatDateTime(detailKey?.created_at) },
            { label: '更新时间', value: formatDateTime(detailKey?.updated_at) },
          ]}
        />
      </Modal>
      <Modal
        visible={!!revokeKey}
        title="吊销密钥"
        onCancel={() => setRevokeKey(null)}
        onOk={() => revoke.mutateAsync(String(revokeKey?.id))}
        confirmLoading={revoke.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="原因">
            <Input.TextArea
              value={revokeReason}
              onChange={setRevokeReason}
              placeholder="可选，记录吊销原因"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
