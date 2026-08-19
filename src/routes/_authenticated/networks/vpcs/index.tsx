import { createFileRoute, Link } from '@tanstack/react-router'
import { Button, Form, Input, Space } from '@arco-design/web-react'
import { useState } from 'react'
import { Ipv4CidrInput } from '@/components/forms/Ipv4CidrInput'
import { SimpleResourceCrud } from '@/components/crud/SimpleResourceCrud'
import { StatusTag } from '@/components/shell/StatusTag'
import { coreApi } from '@/api/client'
import { newIdempotencyKey } from '@/lib/idempotency'
import { listOrThrow } from '@/lib/api-list'
import { formatDateTime } from '@/lib/format'
import { ipv4CidrError, requireIpv4Cidr } from '@/lib/validators'

export const Route = createFileRoute('/_authenticated/networks/vpcs/')({
  component: VpcsPage,
})

function VpcsPage() {
  const [name, setName] = useState('')
  const [cidr, setCidr] = useState('10.0.0.0/16')
  const cidrError = ipv4CidrError(cidr, 'CIDR')

  return (
    <SimpleResourceCrud
      title="VPC"
      subtitle="虚拟私有云"
      queryKey="network-vpcs"
      emptyDescription="暂无 VPC，点击右上角创建"
      showState
      list={() => listOrThrow(() => coreApi.GET('/networks/vpcs', { params: { query: { limit: 50 } } }))}
      onCreate={async () => {}}
      extraColumns={[{ title: 'CIDR', dataIndex: 'cidr' }]}
      createForm={{
        content: (
          <Form layout="vertical">
            <Form.Item label="名称" required>
              <Input value={name} onChange={setName} />
            </Form.Item>
            <Form.Item label="CIDR" validateStatus={cidrError ? 'error' : undefined} help={cidrError}>
              <Ipv4CidrInput value={cidr} onChange={setCidr} placeholder="10.0.0.0" withPrefix />
            </Form.Item>
          </Form>
        ),
        onSubmit: async () => {
          const { error } = await coreApi.POST('/networks/vpcs', {
            body: { name, cidr: requireIpv4Cidr(cidr, 'CIDR'), idempotency_key: newIdempotencyKey() },
          })
          if (error) throw error
        },
        onReset: () => {
          setName('')
          setCidr('10.0.0.0/16')
        },
      }}
      onDelete={async (id) => {
        const { error } = await coreApi.DELETE('/networks/vpcs/{vpc_id}', { params: { path: { vpc_id: id } } })
        if (error) throw error
      }}
      detail={{
        fetch: async (id) => {
          const { data, error } = await coreApi.GET('/networks/vpcs/{vpc_id}', { params: { path: { vpc_id: id } } })
          if (error) throw error
          return data as Record<string, unknown>
        },
        buildFields: (r) => [
          { label: 'ID', value: String(r.id) },
          { label: '名称', value: String(r.name) },
          { label: 'CIDR', value: String(r.cidr) },
          { label: '状态', value: <StatusTag status={r.state as string} /> },
          { label: '创建时间', value: formatDateTime(r.created_at as string) },
          { label: '更新时间', value: formatDateTime(r.updated_at as string) },
        ],
        extraContent: () => (
          <Space>
            <Link to="/networks/subnets">
              <Button type="outline">查看子网</Button>
            </Link>
            <Link to="/networks/routes">
              <Button type="outline">查看路由</Button>
            </Link>
          </Space>
        ),
      }}
    />
  )
}
