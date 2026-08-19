import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, Modal, Select, Space } from '@arco-design/web-react'
import { useState } from 'react'
import { networkRulesTable, SimpleResourceCrud } from '@/components/crud/SimpleResourceCrud'
import { StatusTag } from '@/components/shell/StatusTag'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import { newIdempotencyKey } from '@/lib/idempotency'
import { listOrThrow } from '@/lib/api-list'
import { formatDateTime } from '@/lib/format'
import type { components } from '@/api/core-schema'

type SecurityGroupRule = components['schemas']['NetworkSecurityGroupRule']

export const Route = createFileRoute('/_authenticated/networks/security-groups/')({
  component: SecurityGroupsPage,
})

function SecurityGroupsPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [rules, setRules] = useState<SecurityGroupRule[]>([])

  return (
    <SimpleResourceCrud
      title="安全组"
      queryKey="network-sg"
      emptyDescription="暂无安全组，点击右上角创建"
      showState
      list={() => listOrThrow(() => coreApi.GET('/networks/security-groups', { params: { query: { limit: 50 } } }))}
      onCreate={async () => {}}
      createForm={{
        content: (
          <Form layout="vertical">
            <Form.Item label="名称" required>
              <Input aria-label="名称" value={name} onChange={setName} />
            </Form.Item>
            <Form.Item label="描述">
              <Input value={description} onChange={setDescription} />
            </Form.Item>
            <Form.Item label="规则">
              <SecurityGroupRulesFields rules={rules} onChange={setRules} />
            </Form.Item>
          </Form>
        ),
        onSubmit: async () => {
          const { error } = await coreApi.POST('/networks/security-groups', {
            body: {
              name,
              description: description || undefined,
              rules,
              idempotency_key: newIdempotencyKey(),
            },
          })
          if (error) throw error
        },
        onReset: () => {
          setName('')
          setDescription('')
          setRules([])
        },
      }}
      onDelete={async (id) => {
        const { error } = await coreApi.DELETE('/networks/security-groups/{security_group_id}', {
          params: { path: { security_group_id: id } },
        })
        if (error) throw error
      }}
      detail={{
        fetch: async (id) => {
          const { data, error } = await coreApi.GET('/networks/security-groups/{security_group_id}', {
            params: { path: { security_group_id: id } },
          })
          if (error) throw error
          return data as Record<string, unknown>
        },
        buildFields: (r) => [
          { label: 'ID', value: String(r.id) },
          { label: '名称', value: String(r.name) },
          { label: '描述', value: String(r.description ?? '—') },
          { label: '状态', value: <StatusTag status={r.state as string} /> },
          { label: '创建时间', value: formatDateTime(r.created_at as string) },
        ],
        extraContent: (r) => (
          <div className="space-y-3">
            <SecurityGroupRulesEditor record={r} />
            {networkRulesTable(r.rules as Record<string, unknown>[] | undefined)}
          </div>
        ),
      }}
    />
  )
}

function SecurityGroupRulesEditor({ record }: { record: Record<string, unknown> }) {
  const qc = useQueryClient()
  const securityGroupId = String(record.id)
  const [visible, setVisible] = useState(false)
  const [description, setDescription] = useState(String(record.description ?? ''))
  const [rules, setRules] = useState<SecurityGroupRule[]>((record.rules as SecurityGroupRule[] | undefined) ?? [])

  const openEditor = () => {
    setDescription(String(record.description ?? ''))
    setRules((record.rules as SecurityGroupRule[] | undefined) ?? [])
    setVisible(true)
  }

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.PATCH('/networks/security-groups/{security_group_id}', {
        params: { path: { security_group_id: securityGroupId } },
        body: { description: description || undefined, rules, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setVisible(false)
      qc.invalidateQueries({ queryKey: ['network-sg'] })
      qc.invalidateQueries({ queryKey: ['network-sg', 'detail', securityGroupId] })
    },
    onError: (e) => showApiError(e),
  })

  return (
    <>
      <Button type="outline" onClick={openEditor}>
        编辑规则
      </Button>
      <Modal
        visible={visible}
        title="编辑安全组规则"
        onCancel={() => setVisible(false)}
        onOk={() => update.mutateAsync()}
        confirmLoading={update.isPending}
        okText="保存"
      >
        <Form layout="vertical">
          <Form.Item label="描述">
            <Input value={description} onChange={setDescription} />
          </Form.Item>
          <div className="space-y-3">
            <SecurityGroupRulesFields rules={rules} onChange={setRules} />
          </div>
        </Form>
      </Modal>
    </>
  )
}

function SecurityGroupRulesFields({
  rules,
  onChange,
}: {
  rules: SecurityGroupRule[]
  onChange: (rules: SecurityGroupRule[]) => void
}) {
  const setRule = (index: number, patch: Partial<SecurityGroupRule>) => {
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)))
  }

  return (
    <div className="space-y-3">
      {rules.map((rule, index) => (
        <Space key={index} className="w-full" wrap>
          <Select
            aria-label="方向"
            value={rule.direction}
            onChange={(direction) => setRule(index, { direction })}
            style={{ width: 110 }}
          >
            <Select.Option value="ingress">ingress</Select.Option>
            <Select.Option value="egress">egress</Select.Option>
          </Select>
          <Select
            aria-label="协议"
            value={rule.protocol}
            onChange={(protocol) => setRule(index, { protocol })}
            style={{ width: 100 }}
          >
            <Select.Option value="tcp">tcp</Select.Option>
            <Select.Option value="udp">udp</Select.Option>
            <Select.Option value="icmp">icmp</Select.Option>
            <Select.Option value="all">all</Select.Option>
          </Select>
          <Input
            aria-label="端口"
            value={rule.port_range}
            onChange={(port_range) => setRule(index, { port_range })}
            style={{ width: 100 }}
          />
          <Input
            aria-label="CIDR"
            value={rule.cidr}
            onChange={(cidr) => setRule(index, { cidr })}
            style={{ width: 150 }}
          />
          <Select
            aria-label="动作"
            value={rule.action}
            onChange={(action) => setRule(index, { action })}
            style={{ width: 100 }}
          >
            <Select.Option value="allow">allow</Select.Option>
            <Select.Option value="deny">deny</Select.Option>
          </Select>
          <Button status="danger" type="text" onClick={() => onChange(rules.filter((_, i) => i !== index))}>
            删除
          </Button>
        </Space>
      ))}
      <Button
        type="outline"
        onClick={() =>
          onChange([
            ...rules,
            { direction: 'ingress', protocol: 'tcp', port_range: '80', cidr: '0.0.0.0/0', action: 'allow' },
          ])
        }
      >
        添加规则
      </Button>
    </div>
  )
}
