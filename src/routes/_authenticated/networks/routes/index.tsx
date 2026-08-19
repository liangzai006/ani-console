import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Form, Input, Select } from '@arco-design/web-react'
import { useState } from 'react'
import { Ipv4CidrInput } from '@/components/forms/Ipv4CidrInput'
import { SimpleResourceCrud } from '@/components/crud/SimpleResourceCrud'
import { coreApi } from '@/api/client'
import { newIdempotencyKey } from '@/lib/idempotency'
import { listOrThrow } from '@/lib/api-list'
import { formatDateTime } from '@/lib/format'
import { assertNonEmpty, ipv4CidrError, requireIpv4Cidr } from '@/lib/validators'

export const Route = createFileRoute('/_authenticated/networks/routes/')({
  component: NetworkRoutesPage,
})

function NetworkRoutesPage() {
  const [filterVpcId, setFilterVpcId] = useState('')
  const [vpcId, setVpcId] = useState('')
  const [destinationCidr, setDestinationCidr] = useState('0.0.0.0/0')
  const [nextHopType, setNextHopType] = useState<'gateway' | 'instance' | 'nat'>('gateway')
  const [nextHopId, setNextHopId] = useState('')
  const [description, setDescription] = useState('')
  const [vpcIdError, setVpcIdError] = useState<string>()
  const [nextHopIdError, setNextHopIdError] = useState<string>()
  const destinationCidrError = ipv4CidrError(destinationCidr, '目标网段')
  const vpcs = useQuery({
    queryKey: ['network-vpcs', 'select'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/vpcs', { params: { query: { limit: 50 } } })),
  })

  return (
    <SimpleResourceCrud
      title="路由"
      subtitle="VPC 路由表条目"
      queryKey={['network-routes', filterVpcId]}
      emptyDescription="暂无路由条目，点击右上角创建"
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
          coreApi.GET('/networks/routes', {
            params: { query: { limit: 50, vpc_id: filterVpcId || undefined } },
          }),
        )
      }
      onCreate={async () => {}}
      createForm={{
        content: (
          <Form layout="vertical">
            <Form.Item label="VPC" required validateStatus={vpcIdError ? 'error' : undefined} help={vpcIdError}>
              <Select
                aria-label="VPC"
                value={vpcId}
                onChange={(value) => {
                  setVpcId(value)
                  setVpcIdError(undefined)
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
            <Form.Item
              label="目标网段"
              required
              validateStatus={destinationCidrError ? 'error' : undefined}
              help={destinationCidrError}
            >
              <Ipv4CidrInput value={destinationCidr} onChange={setDestinationCidr} placeholder="0.0.0.0" withPrefix />
            </Form.Item>
            <Form.Item label="下一跳类型" required>
              <Select value={nextHopType} onChange={setNextHopType}>
                <Select.Option value="gateway">gateway</Select.Option>
                <Select.Option value="instance">instance</Select.Option>
                <Select.Option value="nat">nat</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              label="下一跳 ID"
              required
              validateStatus={nextHopIdError ? 'error' : undefined}
              help={nextHopIdError}
            >
              <Input
                aria-label="下一跳 ID"
                value={nextHopId}
                onChange={(value) => {
                  setNextHopId(value)
                  setNextHopIdError(undefined)
                }}
              />
            </Form.Item>
            <Form.Item label="描述">
              <Input value={description} onChange={setDescription} />
            </Form.Item>
          </Form>
        ),
        onSubmit: async () => {
          const nextVpcIdError = vpcId.trim() ? undefined : 'VPC不能为空'
          const nextNextHopIdError = nextHopId.trim() ? undefined : '下一跳 ID不能为空'
          setVpcIdError(nextVpcIdError)
          setNextHopIdError(nextNextHopIdError)
          if (nextVpcIdError || destinationCidrError || nextNextHopIdError) {
            throw new Error('请完整填写路由信息')
          }
          const { error } = await coreApi.POST('/networks/routes', {
            body: {
              vpc_id: assertNonEmpty(vpcId, 'VPC'),
              destination_cidr: requireIpv4Cidr(destinationCidr, '目标网段'),
              next_hop_type: nextHopType,
              next_hop_id: assertNonEmpty(nextHopId, '下一跳 ID'),
              description: description || undefined,
              idempotency_key: newIdempotencyKey(),
            },
          })
          if (error) throw error
        },
        onReset: () => {
          setVpcId('')
          setDestinationCidr('0.0.0.0/0')
          setNextHopType('gateway')
          setNextHopId('')
          setVpcIdError(undefined)
          setNextHopIdError(undefined)
          setDescription('')
        },
      }}
      extraColumns={[
        { title: '目标网段', dataIndex: 'destination_cidr' },
        { title: '下一跳类型', dataIndex: 'next_hop_type' },
        { title: '下一跳', dataIndex: 'next_hop_id' },
        { title: 'VPC', dataIndex: 'vpc_id' },
      ]}
      onDelete={async (id) => {
        const { error } = await coreApi.DELETE('/networks/routes/{route_id}', { params: { path: { route_id: id } } })
        if (error) throw error
      }}
      detail={{
        fetch: async (id) => {
          const { data, error } = await coreApi.GET('/networks/routes/{route_id}', {
            params: { path: { route_id: id } },
          })
          if (error) throw error
          return data as Record<string, unknown>
        },
        buildFields: (r) => [
          { label: 'ID', value: String(r.id) },
          { label: 'VPC', value: String(r.vpc_id) },
          { label: '目标网段', value: String(r.destination_cidr) },
          { label: '下一跳类型', value: String(r.next_hop_type) },
          { label: '下一跳', value: String(r.next_hop_id) },
          { label: '描述', value: String(r.description ?? '—') },
          { label: '创建时间', value: formatDateTime(r.created_at as string) },
        ],
      }}
    />
  )
}
