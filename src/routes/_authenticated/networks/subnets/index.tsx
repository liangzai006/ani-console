import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Form, Input, Select } from '@arco-design/web-react'
import { useState } from 'react'
import { Ipv4CidrInput } from '@/components/forms/Ipv4CidrInput'
import { SimpleResourceCrud } from '@/components/crud/SimpleResourceCrud'
import { StatusTag } from '@/components/shell/StatusTag'
import { coreApi } from '@/api/client'
import { newIdempotencyKey } from '@/lib/idempotency'
import { listOrThrow } from '@/lib/api-list'
import { formatDateTime } from '@/lib/format'
import {
  ipv4CidrWithinError,
  optionalIpv4Error,
  optionalIpv4WithinCidr,
  optionalIpv4WithinCidrError,
  requireIpv4CidrWithin,
  subnetFixedOctets,
  suggestGatewayIp,
  suggestSubnetCidr,
} from '@/lib/validators'

export const Route = createFileRoute('/_authenticated/networks/subnets/')({
  component: SubnetsPage,
})

function SubnetsPage() {
  const [name, setName] = useState('')
  const [vpcId, setVpcId] = useState('')
  const [filterVpcId, setFilterVpcId] = useState('')
  const [cidr, setCidr] = useState('10.0.1.0/24')
  const [gateway, setGateway] = useState('')
  const vpcs = useQuery({
    queryKey: ['network-vpcs', 'select'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/vpcs', { params: { query: { limit: 50 } } })),
  })
  const selectedVpc = (vpcs.data?.items ?? []).find((vpc) => String(vpc.id) === vpcId)
  const selectedVpcCidr = selectedVpc?.cidr ? String(selectedVpc.cidr) : ''
  const cidrError = selectedVpcCidr ? ipv4CidrWithinError(cidr, selectedVpcCidr, 'CIDR', 'VPC CIDR') : undefined
  const gatewayError = cidr ? optionalIpv4WithinCidrError(gateway, cidr, '网关', 'CIDR') : optionalIpv4Error(gateway, '网关')
  const fixedOctets = selectedVpcCidr ? subnetFixedOctets(selectedVpcCidr) : []
  const selectedVpcPrefix = selectedVpcCidr ? Number(selectedVpcCidr.split('/')[1]) : 0

  const setSubnetCidr = (nextCidr: string) => {
    setCidr(nextCidr)
    try {
      setGateway(suggestGatewayIp(nextCidr))
    } catch {
      // CIDR editing can be temporarily incomplete; keep the previous gateway until it is valid again.
    }
  }

  return (
    <SimpleResourceCrud
      title="子网"
      queryKey={['network-subnets', filterVpcId]}
      emptyDescription={filterVpcId ? '该 VPC 下暂无子网，点击右上角创建' : '暂无子网，点击右上角创建'}
      showState
      filters={
        <Select
          aria-label="按 VPC 筛选"
          value={filterVpcId}
          onChange={setFilterVpcId}
          loading={vpcs.isLoading}
          allowClear
          placeholder="按 VPC 筛选"
          style={{ width: 260 }}
        >
          {(vpcs.data?.items ?? []).map((vpc) => (
            <Select.Option key={String(vpc.id)} value={String(vpc.id)}>
              {String(vpc.name ?? vpc.id)}
            </Select.Option>
          ))}
        </Select>
      }
      list={() =>
        listOrThrow(() =>
          coreApi.GET('/networks/subnets', {
            params: { query: { limit: 50, vpc_id: filterVpcId || undefined } },
          }),
        )
      }
      onCreate={async () => {}}
      extraColumns={[
        { title: 'VPC', dataIndex: 'vpc_id' },
        { title: 'CIDR', dataIndex: 'cidr' },
        { title: '网关', render: (_, r) => String(r.gateway ?? '—') },
      ]}
      createForm={{
        content: (
          <Form layout="vertical">
            <Form.Item label="名称" required>
              <Input value={name} onChange={setName} />
            </Form.Item>
            <Form.Item label="VPC" required>
              <Select
                value={vpcId}
                onChange={(nextVpcId) => {
                  setVpcId(nextVpcId)
                  const vpc = (vpcs.data?.items ?? []).find((item) => String(item.id) === nextVpcId)
                  if (vpc?.cidr) setSubnetCidr(suggestSubnetCidr(String(vpc.cidr)))
                }}
                loading={vpcs.isLoading}
                placeholder="选择 VPC"
              >
                {(vpcs.data?.items ?? []).map((vpc) => (
                  <Select.Option key={String(vpc.id)} value={String(vpc.id)}>
                    {String(vpc.name ?? vpc.id)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="CIDR" validateStatus={cidrError ? 'error' : undefined} help={cidrError}>
              <Ipv4CidrInput
                value={cidr}
                onChange={setSubnetCidr}
                placeholder="10.0.1.0"
                withPrefix
                disabledOctets={fixedOctets}
                minPrefix={selectedVpcPrefix}
              />
            </Form.Item>
            <Form.Item label="网关" validateStatus={gatewayError ? 'error' : undefined} help={gatewayError}>
              <Ipv4CidrInput value={gateway} onChange={setGateway} placeholder="10.0.1.1" />
            </Form.Item>
          </Form>
        ),
        onSubmit: async () => {
          if (!selectedVpcCidr) throw new Error('请选择 VPC')
          const { error } = await coreApi.POST('/networks/subnets', {
            body: {
              name,
              vpc_id: vpcId,
              cidr: requireIpv4CidrWithin(cidr, selectedVpcCidr, 'CIDR', 'VPC CIDR'),
              gateway: optionalIpv4WithinCidr(gateway, cidr, '网关', 'CIDR'),
              idempotency_key: newIdempotencyKey(),
            },
          })
          if (error) throw error
        },
        onReset: () => {
          setName('')
          setVpcId('')
          setCidr('10.0.1.0/24')
          setGateway('')
        },
      }}
      onDelete={async (id) => {
        const { error } = await coreApi.DELETE('/networks/subnets/{subnet_id}', { params: { path: { subnet_id: id } } })
        if (error) throw error
      }}
      detail={{
        fetch: async (id) => {
          const { data, error } = await coreApi.GET('/networks/subnets/{subnet_id}', {
            params: { path: { subnet_id: id } },
          })
          if (error) throw error
          return data as Record<string, unknown>
        },
        buildFields: (r) => [
          { label: 'ID', value: String(r.id) },
          { label: '名称', value: String(r.name) },
          { label: 'VPC', value: String(r.vpc_id) },
          { label: 'CIDR', value: String(r.cidr) },
          { label: '网关', value: String(r.gateway ?? '—') },
          { label: '状态', value: <StatusTag status={r.state as string} /> },
          { label: '创建时间', value: formatDateTime(r.created_at as string) },
        ],
      }}
    />
  )
}
