import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button, Form, Input, InputNumber, Select, Space } from '@arco-design/web-react'
import { useState } from 'react'
import { networkListenersTable, SimpleResourceCrud } from '@/components/crud/SimpleResourceCrud'
import { StatusTag } from '@/components/shell/StatusTag'
import { coreApi } from '@/api/client'
import { newIdempotencyKey } from '@/lib/idempotency'
import { listOrThrow } from '@/lib/api-list'
import { formatDateTime } from '@/lib/format'
import type { components } from '@/api/core-schema'

type LoadBalancerListener = components['schemas']['NetworkLoadBalancerListener']

export const Route = createFileRoute('/_authenticated/networks/load-balancers/')({
  component: LoadBalancersPage,
})

function LoadBalancersPage() {
  const [name, setName] = useState('')
  const [vpcId, setVpcId] = useState('')
  const [subnetId, setSubnetId] = useState('')
  const [scheme, setScheme] = useState<'internal' | 'public'>('internal')
  const [listeners, setListeners] = useState<LoadBalancerListener[]>([])
  const vpcs = useQuery({
    queryKey: ['network-vpcs', 'select'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/vpcs', { params: { query: { limit: 50 } } })),
  })
  const subnets = useQuery({
    queryKey: ['network-subnets', 'select'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/subnets', { params: { query: { limit: 50 } } })),
  })

  return (
    <SimpleResourceCrud
      title="负载均衡"
      queryKey="network-lb"
      emptyDescription="暂无负载均衡，点击右上角创建"
      showState
      list={() => listOrThrow(() => coreApi.GET('/networks/load-balancers', { params: { query: { limit: 50 } } }))}
      onCreate={async () => {}}
      createForm={{
        content: (
          <Form layout="vertical">
            <Form.Item label="名称" required>
              <Input aria-label="名称" value={name} onChange={setName} />
            </Form.Item>
            <Form.Item label="VPC" required>
              <Select aria-label="VPC" value={vpcId} onChange={setVpcId} loading={vpcs.isLoading} placeholder="选择 VPC">
                {(vpcs.data?.items ?? []).map((vpc) => (
                  <Select.Option key={String(vpc.id)} value={String(vpc.id)}>
                    {String(vpc.name ?? vpc.id)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="子网">
              <Select value={subnetId} onChange={setSubnetId} loading={subnets.isLoading} allowClear placeholder="可选">
                {(subnets.data?.items ?? [])
                  .filter((subnet) => !vpcId || subnet.vpc_id === vpcId)
                  .map((subnet) => (
                    <Select.Option key={String(subnet.id)} value={String(subnet.id)}>
                      {String(subnet.name ?? subnet.id)}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
            <Form.Item label="类型">
              <Select value={scheme} onChange={setScheme}>
                <Select.Option value="internal">internal</Select.Option>
                <Select.Option value="public">public</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="监听器">
              <LoadBalancerListenersFields listeners={listeners} onChange={setListeners} />
            </Form.Item>
          </Form>
        ),
        onSubmit: async () => {
          const { error } = await coreApi.POST('/networks/load-balancers', {
            body: {
              name,
              vpc_id: vpcId,
              subnet_id: subnetId || undefined,
              scheme,
              listeners,
              idempotency_key: newIdempotencyKey(),
            },
          })
          if (error) throw error
        },
        onReset: () => {
          setName('')
          setVpcId('')
          setSubnetId('')
          setScheme('internal')
          setListeners([])
        },
      }}
      onDelete={async (id) => {
        const { error } = await coreApi.DELETE('/networks/load-balancers/{load_balancer_id}', {
          params: { path: { load_balancer_id: id } },
        })
        if (error) throw error
      }}
      detail={{
        fetch: async (id) => {
          const { data, error } = await coreApi.GET('/networks/load-balancers/{load_balancer_id}', {
            params: { path: { load_balancer_id: id } },
          })
          if (error) throw error
          return data as Record<string, unknown>
        },
        buildFields: (r) => [
          { label: 'ID', value: String(r.id) },
          { label: '名称', value: String(r.name) },
          { label: 'VPC', value: String(r.vpc_id) },
          { label: '子网', value: String(r.subnet_id ?? '—') },
          { label: '类型', value: String(r.scheme) },
          { label: 'VIP', value: String(r.vip ?? '—') },
          { label: '状态', value: <StatusTag status={r.state as string} /> },
          { label: '创建时间', value: formatDateTime(r.created_at as string) },
        ],
        extraContent: (r) => networkListenersTable(r.listeners as Record<string, unknown>[] | undefined),
      }}
    />
  )
}

function LoadBalancerListenersFields({
  listeners,
  onChange,
}: {
  listeners: LoadBalancerListener[]
  onChange: (listeners: LoadBalancerListener[]) => void
}) {
  const setListener = (index: number, patch: Partial<LoadBalancerListener>) => {
    onChange(listeners.map((listener, i) => (i === index ? { ...listener, ...patch } : listener)))
  }

  return (
    <div className="space-y-3">
      {listeners.map((listener, index) => (
        <Space key={index} className="w-full" wrap>
          <Select
            aria-label="协议"
            value={listener.protocol}
            onChange={(protocol) => setListener(index, { protocol })}
            style={{ width: 110 }}
          >
            <Select.Option value="http">http</Select.Option>
            <Select.Option value="https">https</Select.Option>
            <Select.Option value="tcp">tcp</Select.Option>
          </Select>
          <InputNumber
            aria-label="端口"
            value={listener.port}
            min={1}
            max={65535}
            precision={0}
            onChange={(port) => setListener(index, { port: Number(port ?? 1) })}
            style={{ width: 120 }}
          />
          <InputNumber
            aria-label="目标端口"
            value={listener.target_port}
            min={1}
            max={65535}
            precision={0}
            onChange={(target_port) => setListener(index, { target_port: Number(target_port ?? 1) })}
            style={{ width: 120 }}
          />
          <Button status="danger" type="text" onClick={() => onChange(listeners.filter((_, i) => i !== index))}>
            删除
          </Button>
        </Space>
      ))}
      <Button
        type="outline"
        onClick={() => onChange([...listeners, { protocol: 'tcp', port: 80, target_port: 8080 }])}
      >
        添加监听器
      </Button>
    </div>
  )
}
