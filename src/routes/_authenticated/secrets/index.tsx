import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, Modal, Select, Space } from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { CursorTable } from '@/components/tables/CursorTable'
import { StatusTag } from '@/components/shell/StatusTag'
import { newIdempotencyKey } from '@/lib/idempotency'
import { showApiError } from '@/api/helpers'
import { listOrThrow } from '@/lib/api-list'
import { formatDateTime } from '@/lib/format'
import type { components } from '@/api/core-schema'

type Secret = components['schemas']['Secret']
type SecretType = components['schemas']['SecretCreateRequest']['type']
type SecretDataRow = { key: string; value: string }

function templateRowsForType(type: SecretType): SecretDataRow[] {
  if (type === 'dockerconfigjson') return [{ key: '.dockerconfigjson', value: '' }]
  if (type === 'tls') {
    return [
      { key: 'tls.crt', value: '' },
      { key: 'tls.key', value: '' },
    ]
  }
  return [{ key: 'key', value: '' }]
}

export const Route = createFileRoute('/_authenticated/secrets/')({ component: SecretsPage })

function SecretsPage() {
  const qc = useQueryClient()
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<SecretType>('opaque')
  const [dataRows, setDataRows] = useState<SecretDataRow[]>([{ key: 'key', value: '' }])

  const { data, isLoading, error } = useQuery({
    queryKey: ['secrets'],
    queryFn: () => listOrThrow(() => coreApi.GET('/secrets', { params: { query: { limit: 50 } } })),
  })

  const resetForm = () => {
    setName('')
    setType('opaque')
    setDataRows(templateRowsForType('opaque'))
  }

  const create = useMutation({
    mutationFn: async () => {
      const secretData = dataRows.reduce<Record<string, string>>((acc, row) => {
        const key = row.key.trim()
        if (key) acc[key] = row.value
        return acc
      }, {})
      if (!Object.keys(secretData).length) throw new Error('Secret data 至少需要一个 key')
      const { error } = await coreApi.POST('/secrets', {
        body: {
          name,
          type,
          data: secretData,
          idempotency_key: newIdempotencyKey(),
        },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setVisible(false)
      resetForm()
      qc.invalidateQueries({ queryKey: ['secrets'] })
    },
    onError: (e) => showApiError(e),
  })

  const deleteSecret = useMutation({
    mutationFn: async (secretId: string) => {
      const { error } = await coreApi.DELETE('/secrets/{secret_id}', {
        params: { path: { secret_id: secretId } },
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['secrets'] }),
    onError: (e) => showApiError(e),
  })

  const items = (data?.items ?? []) as Secret[]

  return (
    <div className="space-y-4">
      <PageHeader
        title="密钥管理"
        extra={
          <Button type="primary" onClick={() => setVisible(true)}>
            创建
          </Button>
        }
      />
      <CursorTable<Secret>
        columns={[
          {
            title: '名称',
            render: (_, r) => (
              <Link to="/secrets/$secretId" params={{ secretId: String(r.id) }}>
                {r.name ?? r.id}
              </Link>
            ),
          },
          { title: '类型', dataIndex: 'type' },
          { title: 'Keys', render: (_, r) => (r.keys?.length ? r.keys.join(', ') : '—') },
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
                      title: '删除 Secret',
                      content: `确定删除「${r.name ?? r.id}」？`,
                      onOk: () => deleteSecret.mutateAsync(String(r.id)),
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
        emptyDescription="暂无 Secret，点击右上角创建"
      />
      <Modal
        visible={visible}
        title="创建 Secret"
        onCancel={() => setVisible(false)}
        onOk={() => create.mutateAsync()}
        confirmLoading={create.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="名称" required>
            <Input value={name} onChange={setName} />
          </Form.Item>
          <Form.Item label="类型">
            <Select
              value={type}
              onChange={(nextType) => {
                setType(nextType)
                setDataRows(templateRowsForType(nextType))
              }}
            >
              <Select.Option value="opaque">opaque</Select.Option>
              <Select.Option value="dockerconfigjson">dockerconfigjson</Select.Option>
              <Select.Option value="tls">tls</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Data" required>
            <div className="space-y-2">
              {dataRows.map((row, index) => (
                <Space key={index} align="start" className="w-full">
                  <Input
                    value={row.key}
                    onChange={(key) =>
                      setDataRows((rows) => rows.map((item, itemIndex) => (itemIndex === index ? { ...item, key } : item)))
                    }
                    placeholder="key"
                    className="w-[160px]"
                  />
                  <Input.Password
                    value={row.value}
                    onChange={(value) =>
                      setDataRows((rows) =>
                        rows.map((item, itemIndex) => (itemIndex === index ? { ...item, value } : item)),
                      )
                    }
                    placeholder="value"
                    className="w-[220px]"
                  />
                  <Button
                    type="text"
                    status="danger"
                    disabled={dataRows.length === 1}
                    onClick={() => setDataRows((rows) => rows.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    删除
                  </Button>
                </Space>
              ))}
              <Button type="outline" onClick={() => setDataRows((rows) => [...rows, { key: '', value: '' }])}>
                添加字段
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
