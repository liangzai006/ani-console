import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Space,
  Tag,
  Typography,
} from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { CursorTable } from '@/components/tables/CursorTable'
import { StatusTag } from '@/components/shell/StatusTag'
import { showApiError } from '@/api/helpers'
import { formatDateTime } from '@/lib/format'
import { newIdempotencyKey } from '@/lib/idempotency'
import {
  assertIntegerRange,
  assertMaxLength,
  assertNonEmpty,
  isValidScope,
  optionalIsoDateTime,
  parseScopeList,
} from '@/lib/validators'
import type { components } from '@/api/core-schema'

export const Route = createFileRoute('/_authenticated/settings/api-keys')({
  component: ApiKeysPage,
})

type ApiKeyRow = components['schemas']['APIKeyInfo']
type CreatedApiKey = components['schemas']['CreateAPIKeyResponse']

function ApiKeysPage() {
  const qc = useQueryClient()
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')
  const [userId, setUserId] = useState('')
  const [scopesText, setScopesText] = useState('scope:instances:*')
  const [rateLimitRpm, setRateLimitRpm] = useState(60)
  const [expiresAt, setExpiresAt] = useState('')
  const [createdSecret, setCreatedSecret] = useState<CreatedApiKey | null>(null)

  const setExpiresAtFromPicker = (dateString: string) => {
    setExpiresAt(dateString ? new Date(dateString).toISOString() : '')
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/auth/api-keys')
      if (error) throw error
      return data
    },
  })

  const resetForm = () => {
    setName('')
    setUserId('')
    setScopesText('scope:instances:*')
    setRateLimitRpm(60)
    setExpiresAt('')
  }

  const buildRequestBody = () => {
    const requestName = assertMaxLength(assertNonEmpty(name, '名称'), 128, '名称')
    const scopes = parseScopeList(scopesText)
    if (scopes.length < 1) throw new Error('权限范围至少填写一项')
    const invalidScope = scopes.find((scope) => !isValidScope(scope))
    if (invalidScope) throw new Error(`权限范围格式不正确：${invalidScope}`)
    return {
      idempotency_key: newIdempotencyKey(),
      name: requestName,
      user_id: userId.trim() || undefined,
      scopes,
      rate_limit_rpm: assertIntegerRange(rateLimitRpm, 1, 10000, '速率限制'),
      expires_at: optionalIsoDateTime(expiresAt),
    }
  }

  const createKey = useMutation({
    mutationFn: async () => {
      const { data, error } = await coreApi.POST('/auth/api-keys', {
        body: buildRequestBody(),
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setCreatedSecret(data ?? null)
      setVisible(false)
      resetForm()
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (e) => showApiError(e),
  })

  const submitCreate = () => {
    try {
      buildRequestBody()
    } catch (e) {
      Message.error(e instanceof Error ? e.message : '表单校验失败')
      return
    }
    createKey.mutateAsync()
  }

  const revokeKey = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await coreApi.DELETE('/auth/api-keys/{key_id}', {
        params: { path: { key_id: keyId } },
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
    onError: (e) => showApiError(e),
  })

  const items = data?.items ?? []

  return (
    <>
      <PageHeader
        title="API Key"
        subtitle="长期访问凭证，用于 CLI 与自动化集成"
        extra={
          <Button type="primary" onClick={() => setVisible(true)}>
            创建 API Key
          </Button>
        }
      />
      <CursorTable<ApiKeyRow>
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: '前缀', dataIndex: 'key_prefix' },
          {
            title: '权限范围',
            render: (_, row) => (
              <Space wrap size={4}>
                {row.scopes.map((scope) => (
                  <Tag key={scope}>{scope}</Tag>
                ))}
              </Space>
            ),
          },
          { title: '速率限制', render: (_, row) => `${row.rate_limit_rpm}/min` },
          { title: '状态', render: (_, row) => <StatusTag status={row.is_active ? 'active' : 'revoked'} /> },
          { title: '创建时间', render: (_, row) => formatDateTime(row.created_at) },
          { title: '过期时间', render: (_, row) => row.expires_at ? formatDateTime(row.expires_at) : '永不过期' },
          { title: '最后使用', render: (_, row) => row.last_used_at ? formatDateTime(row.last_used_at) : '从未使用' },
          {
            title: '操作',
            render: (_, row) => (
              <Button
                type="text"
                status="danger"
                disabled={!row.is_active}
                onClick={() =>
                  Modal.confirm({
                    title: '确认撤销',
                    content: `撤销 API Key「${row.name ?? row.id}」？此操作不可恢复。`,
                    okButtonProps: { status: 'danger' },
                    onOk: () => revokeKey.mutateAsync(row.id),
                  })
                }
              >
                撤销
              </Button>
            ),
          },
        ]}
        data={{ items }}
        loading={isLoading}
        error={error}
        rowKey="id"
        emptyDescription="暂无 API Key，点击右上角创建"
      />
      <Modal
        visible={!!createdSecret}
        title="请保存密钥"
        okText="已保存"
        hideCancel
        onOk={() => setCreatedSecret(null)}
        onCancel={() => setCreatedSecret(null)}
      >
        <div className="space-y-4">
          <Typography.Paragraph type="secondary">此密钥仅显示一次，关闭后无法再次查看。</Typography.Paragraph>
          <Descriptions
            column={1}
            data={[
              { label: 'Key ID', value: createdSecret?.key_id },
              { label: 'Key Prefix', value: createdSecret?.key_prefix },
            ]}
          />
          <Input.TextArea value={createdSecret?.key_value ?? ''} readOnly autoSize />
        </div>
      </Modal>
      <Modal
        visible={visible}
        title="创建 API Key"
        onCancel={() => setVisible(false)}
        onOk={submitCreate}
        confirmLoading={createKey.isPending}
      >
        <Form layout="vertical">
          <Typography.Text className="mb-2 block font-medium">基础信息</Typography.Text>
          <Form.Item label="名称" required>
            <Input value={name} onChange={setName} maxLength={128} placeholder="例如 ci-deploy" />
          </Form.Item>
          <Form.Item label="用户 ID">
            <Input value={userId} onChange={setUserId} placeholder="为空时使用当前认证用户" />
          </Form.Item>
          <Typography.Text className="mb-2 block font-medium">权限范围</Typography.Text>
          <Form.Item label="Scopes" required>
            <Input.TextArea
              value={scopesText}
              onChange={setScopesText}
              autoSize={{ minRows: 3, maxRows: 6 }}
              placeholder="scope:instances:*&#10;scope:objects:read"
            />
          </Form.Item>
          <Typography.Text className="mb-2 block font-medium">限制与过期</Typography.Text>
          <Form.Item label="速率限制 RPM" required>
            <InputNumber
              value={rateLimitRpm}
              min={1}
              max={10000}
              precision={0}
              onChange={(value) => setRateLimitRpm(Number(value ?? 60))}
            />
          </Form.Item>
          <Form.Item label="过期时间">
            <DatePicker
              value={expiresAt}
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              onChange={setExpiresAtFromPicker}
              placeholder="选择过期时间"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
