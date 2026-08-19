import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Descriptions, Empty, Form, Input, Modal, Select, Space, Spin } from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'
import { showApiError } from '@/api/helpers'
import { formatDateTime } from '@/lib/format'
import { newIdempotencyKey } from '@/lib/idempotency'
import type { components } from '@/api/core-schema'

type BindingTargetType = components['schemas']['SecretBindingRequest']['target_type']

export const Route = createFileRoute('/_authenticated/secrets/$secretId')({ component: SecretDetailPage })

function SecretDetailPage() {
  const { secretId } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [targetType, setTargetType] = useState<BindingTargetType>('instance')
  const [targetId, setTargetId] = useState('')
  const [mountPath, setMountPath] = useState('')
  const [envPrefix, setEnvPrefix] = useState('')
  const [bindResult, setBindResult] = useState<string | null>(null)

  const detail = useQuery({
    queryKey: ['secret', secretId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/secrets/{secret_id}', {
        params: { path: { secret_id: secretId } },
      })
      if (error) throw error
      return data
    },
  })

  const bind = useMutation({
    mutationFn: async () => {
      const { data, error } = await coreApi.POST('/secrets/{secret_id}/bindings', {
        params: { path: { secret_id: secretId } },
        body: {
          idempotency_key: newIdempotencyKey(),
          target_type: targetType,
          target_id: targetId,
          mount_path: mountPath || undefined,
          env_prefix: envPrefix || undefined,
        },
      })
      if (error) throw error
      return data
    },
    onSuccess: (d) => setBindResult((d as { id?: string })?.id ?? '绑定成功'),
    onError: (e) => showApiError(e),
  })

  const deleteSecret = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.DELETE('/secrets/{secret_id}', {
        params: { path: { secret_id: secretId } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['secrets'] })
      navigate({ to: '/secrets' })
    },
    onError: (e) => showApiError(e),
  })

  if (detail.isLoading && !detail.data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Secret 详情" subtitle="加载中..." />
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      </div>
    )
  }

  if (detail.error) return <ApiErrorAlert error={detail.error} />

  const secret = detail.data

  return (
    <div className="space-y-5">
      <PageHeader
        title={secret?.name ?? secretId}
        extra={
          <Space>
            <Button
              type="outline"
              status="danger"
              loading={deleteSecret.isPending}
              onClick={() =>
                Modal.confirm({
                  title: '删除 Secret',
                  content: `确定删除「${secret?.name ?? secretId}」？`,
                  onOk: () => deleteSecret.mutateAsync(),
                })
              }
            >
              删除
            </Button>
            <Link to="/secrets">返回列表</Link>
          </Space>
        }
      />
      <Card>
        <Descriptions
          column={{ xs: 1, sm: 2 }}
          data={[
            { label: 'ID', value: secret?.id },
            { label: '类型', value: secret?.type },
            { label: 'Keys', value: secret?.keys?.length ? secret.keys.join(', ') : '—' },
            { label: '状态', value: secret?.state ?? '—' },
            { label: '创建时间', value: formatDateTime(secret?.created_at) },
            { label: '更新时间', value: formatDateTime(secret?.updated_at) },
          ]}
        />
      </Card>
      <Card title="绑定到资源">
        <div className="space-y-4">
          <Form layout="vertical">
            <Form.Item label="目标类型" required>
              <Select value={targetType} onChange={setTargetType}>
                <Select.Option value="instance">instance</Select.Option>
                <Select.Option value="k8s-cluster">k8s-cluster</Select.Option>
                <Select.Option value="service">service</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="目标 ID" required>
              <Input value={targetId} onChange={setTargetId} placeholder="target_id" />
            </Form.Item>
            <Form.Item label="挂载路径">
              <Input value={mountPath} onChange={setMountPath} placeholder="/etc/secrets/app" />
            </Form.Item>
            <Form.Item label="环境变量前缀">
              <Input value={envPrefix} onChange={setEnvPrefix} placeholder="APP_" />
            </Form.Item>
            <Button type="primary" loading={bind.isPending} onClick={() => bind.mutateAsync()}>
              绑定
            </Button>
          </Form>
          {bindResult ? (
            <Descriptions column={1} data={[{ label: '绑定结果', value: bindResult }]} />
          ) : (
            <Empty description="输入目标资源后进行绑定" />
          )}
        </div>
      </Card>
    </div>
  )
}
