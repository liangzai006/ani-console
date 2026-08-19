import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Empty, Form, Input, Modal, Select, Space, Switch, Tabs } from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { CursorTable } from '@/components/tables/CursorTable'
import { newIdempotencyKey } from '@/lib/idempotency'
import { showApiError } from '@/api/helpers'
import { listOrThrow } from '@/lib/api-list'
import type { components } from '@/api/core-schema'

export const Route = createFileRoute('/_authenticated/observability/')({ component: ObservabilityPage })

type AlertRule = components['schemas']['ObservabilityAlertRule']
type AlertSeverity = components['schemas']['CreateObservabilityAlertRuleRequest']['severity']
type RuleFormState = {
  name: string
  promql: string
  duration: string
  severity: AlertSeverity
  enabled: boolean
  labelsJson: string
  annotationsJson: string
}

const defaultRuleForm: RuleFormState = {
  name: '',
  promql: 'up',
  duration: '5m',
  severity: 'warning',
  enabled: true,
  labelsJson: '{}',
  annotationsJson: '{}',
}

function parseStringMap(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = JSON.parse(trimmed)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined
}

function ObservabilityPage() {
  const qc = useQueryClient()
  const [promql, setPromql] = useState('up')
  const [ruleVisible, setRuleVisible] = useState(false)
  const [ruleForm, setRuleForm] = useState<RuleFormState>(defaultRuleForm)
  const [editRuleId, setEditRuleId] = useState<string | null>(null)
  const [editRuleForm, setEditRuleForm] = useState<RuleFormState>(defaultRuleForm)

  const query = useMutation({
    mutationFn: async () => {
      const { data, error } = await coreApi.GET('/observability/query', { params: { query: { query: promql } } })
      if (error) throw error
      return data
    },
    onError: (e) => showApiError(e),
  })

  const rules = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => listOrThrow(() => coreApi.GET('/observability/alert-rules', { params: { query: { limit: 50 } } })),
  })

  const createRule = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.POST('/observability/alert-rules', {
        body: {
          idempotency_key: newIdempotencyKey(),
          name: ruleForm.name,
          promql: ruleForm.promql,
          duration: ruleForm.duration,
          severity: ruleForm.severity,
          enabled: ruleForm.enabled,
          labels: parseStringMap(ruleForm.labelsJson),
          annotations: parseStringMap(ruleForm.annotationsJson),
        },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setRuleVisible(false)
      setRuleForm(defaultRuleForm)
      qc.invalidateQueries({ queryKey: ['alert-rules'] })
    },
    onError: (e) => showApiError(e),
  })

  const loadRuleForEdit = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await coreApi.GET('/observability/alert-rules/{rule_id}', {
        params: { path: { rule_id: id } },
      })
      if (error) throw error
      setEditRuleId(id)
      setEditRuleForm({
        name: data?.name ?? '',
        promql: data?.promql ?? '',
        duration: data?.duration ?? '5m',
        severity: data?.severity ?? 'warning',
        enabled: data?.enabled ?? true,
        labelsJson: JSON.stringify(data?.labels ?? {}, null, 2),
        annotationsJson: JSON.stringify(data?.annotations ?? {}, null, 2),
      })
    },
    onError: (e) => showApiError(e),
  })

  const updateRule = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.PATCH('/observability/alert-rules/{rule_id}', {
        params: { path: { rule_id: editRuleId! } },
        body: {
          idempotency_key: newIdempotencyKey(),
          name: editRuleForm.name,
          promql: editRuleForm.promql,
          duration: editRuleForm.duration,
          severity: editRuleForm.severity,
          enabled: editRuleForm.enabled,
          labels: parseStringMap(editRuleForm.labelsJson),
          annotations: parseStringMap(editRuleForm.annotationsJson),
        },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setEditRuleId(null)
      qc.invalidateQueries({ queryKey: ['alert-rules'] })
    },
    onError: (e) => showApiError(e),
  })

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await coreApi.DELETE('/observability/alert-rules/{rule_id}', { params: { path: { rule_id: id } } })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-rules'] }),
    onError: (e) => showApiError(e),
  })

  const ruleItems = (rules.data?.items ?? []) as AlertRule[]
  const queryItems = ((query.data as { result?: Record<string, unknown>[] } | undefined)?.result ?? []) as Record<
    string,
    unknown
  >[]

  return (
    <div className="space-y-4">
      <PageHeader title="监控与告警" subtitle="PromQL 查询与告警规则" />
      <Tabs>
        <Tabs.TabPane key="query" title="PromQL 查询">
          <div className="space-y-4">
            <Space wrap>
              <Input value={promql} onChange={setPromql} className="w-[400px]" />
              <Button type="primary" loading={query.isPending} onClick={() => query.mutateAsync()}>
                查询
              </Button>
            </Space>
            {query.isIdle && !query.data ? (
              <Empty description="输入 PromQL 后点击查询" />
            ) : (
              <CursorTable<Record<string, unknown>>
                columns={[
                  { title: 'metric', render: (_, r) => JSON.stringify(r.metric ?? {}) },
                  { title: 'value', render: (_, r) => JSON.stringify(r.value ?? []) },
                ]}
                data={{ items: queryItems }}
                loading={query.isPending}
                error={query.error}
                rowKey={(r) => JSON.stringify(r)}
                emptyDescription="查询无结果"
              />
            )}
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane key="rules" title="告警规则">
          <div className="space-y-4">
            <Button type="primary" onClick={() => setRuleVisible(true)}>
              创建规则
            </Button>
            <CursorTable<AlertRule>
              columns={[
                { title: '名称', dataIndex: 'name' },
                { title: 'PromQL', dataIndex: 'promql' },
                { title: '持续时间', dataIndex: 'duration' },
                { title: '级别', dataIndex: 'severity' },
                { title: '启用', render: (_, r) => (r.enabled ? '是' : '否') },
                {
                  title: '操作',
                  render: (_, r) => (
                    <Space>
                      <Button type="text" loading={loadRuleForEdit.isPending} onClick={() => loadRuleForEdit.mutateAsync(r.id)}>
                        编辑
                      </Button>
                      <Button
                        type="text"
                        status="danger"
                        onClick={() =>
                          Modal.confirm({
                            title: '删除告警规则',
                            content: `确定删除「${r.name}」？`,
                            onOk: () => deleteRule.mutateAsync(r.id),
                          })
                        }
                      >
                        删除
                      </Button>
                    </Space>
                  ),
                },
              ]}
              data={{ items: ruleItems, next_cursor: rules.data?.next_cursor }}
              loading={rules.isLoading}
              error={rules.error}
              rowKey="id"
              emptyDescription="暂无告警规则"
            />
          </div>
        </Tabs.TabPane>
      </Tabs>
      <RuleModal
        visible={ruleVisible}
        title="创建告警规则"
        value={ruleForm}
        loading={createRule.isPending}
        onChange={setRuleForm}
        onCancel={() => setRuleVisible(false)}
        onOk={() => createRule.mutateAsync()}
      />
      <RuleModal
        visible={!!editRuleId}
        title="编辑告警规则"
        value={editRuleForm}
        loading={updateRule.isPending}
        onChange={setEditRuleForm}
        onCancel={() => setEditRuleId(null)}
        onOk={() => updateRule.mutateAsync()}
      />
    </div>
  )
}

function RuleModal({
  visible,
  title,
  value,
  loading,
  onChange,
  onCancel,
  onOk,
}: {
  visible: boolean
  title: string
  value: RuleFormState
  loading: boolean
  onChange: (value: RuleFormState) => void
  onCancel: () => void
  onOk: () => void
}) {
  return (
    <Modal visible={visible} title={title} onCancel={onCancel} onOk={onOk} confirmLoading={loading}>
      <Form layout="vertical">
        <Form.Item label="规则名称" required>
          <Input value={value.name} onChange={(name) => onChange({ ...value, name })} />
        </Form.Item>
        <Form.Item label="PromQL" required>
          <Input value={value.promql} onChange={(promql) => onChange({ ...value, promql })} />
        </Form.Item>
        <Form.Item label="持续时间" required>
          <Input value={value.duration} onChange={(duration) => onChange({ ...value, duration })} placeholder="5m" />
        </Form.Item>
        <Form.Item label="级别" required>
          <Select value={value.severity} onChange={(severity) => onChange({ ...value, severity })}>
            <Select.Option value="info">info</Select.Option>
            <Select.Option value="warning">warning</Select.Option>
            <Select.Option value="critical">critical</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="启用">
          <Switch checked={value.enabled} onChange={(enabled) => onChange({ ...value, enabled })} />
        </Form.Item>
        <Form.Item label="Labels JSON">
          <Input.TextArea
            value={value.labelsJson}
            onChange={(labelsJson) => onChange({ ...value, labelsJson })}
            autoSize={{ minRows: 2, maxRows: 5 }}
          />
        </Form.Item>
        <Form.Item label="Annotations JSON">
          <Input.TextArea
            value={value.annotationsJson}
            onChange={(annotationsJson) => onChange({ ...value, annotationsJson })}
            autoSize={{ minRows: 2, maxRows: 5 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
