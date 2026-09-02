import {
  DataTable,
  DetailPageFrame,
  DetailPagePlaceholder,
  AliIcon,
  StatusTag,
} from '@/components/common'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Empty, List, Modal, Space, Spin, Tag, Typography } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { asUncontractedQuery } from '@/api/uncontracted-query'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { formatDateTime } from '@/lib/format'
import { listOrThrow } from '@/lib/api-list'
import { useListErrorNotification } from '@/hooks/useListErrorNotification'

type Vpc = components['schemas']['NetworkVPC']
type Subnet = components['schemas']['NetworkSubnet']
type NetworkRoute = components['schemas']['NetworkRoute']
type SecurityGroup = components['schemas']['NetworkSecurityGroup']
type LoadBalancer = components['schemas']['NetworkLoadBalancer']
type Instance = components['schemas']['InstanceRecord']

type RelatedResource = {
  id: string
  kind: '子网' | '安全组' | '路由' | '负载均衡' | '实例'
  name: string
  status: string
  group: '网络' | '算力'
  route:
    | '/subnets'
    | '/security-groups'
    | '/routes'
    | '/load-balancers/$loadBalancerId'
    | '/compute-instances/$instanceId'
}

export function VpcDetailPage({ vpcId }: { vpcId: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: ['network-vpc', vpcId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/networks/vpcs/{vpc_id}', {
        params: { path: { vpc_id: vpcId } },
      })
      if (error) throw error
      return data
    },
  })
  const subnets = useQuery({
    queryKey: ['network-subnets', vpcId],
    queryFn: () =>
      listOrThrow(() => coreApi.GET('/networks/subnets', { params: { query: { vpc_id: vpcId, limit: 100 } } })),
  })
  const routes = useQuery({
    queryKey: ['network-routes', vpcId],
    queryFn: () =>
      listOrThrow(() => coreApi.GET('/networks/routes', { params: { query: { vpc_id: vpcId, limit: 100 } } })),
  })
  const securityGroups = useQuery({
    queryKey: ['network-security-groups', 'vpc-related'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/security-groups', {
      params: { query: asUncontractedQuery({ limit: 100, vpc_id: vpcId }) },
    })),
  })
  const loadBalancers = useQuery({
    queryKey: ['network-load-balancers', 'vpc', vpcId],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/load-balancers', {
      params: { query: asUncontractedQuery({ limit: 100, vpc_id: vpcId }) },
    })),
  })
  const instances = useQuery({
    queryKey: ['instances', 'vpc', vpcId],
    queryFn: () => listOrThrow(() => coreApi.GET('/instances', {
      params: { query: asUncontractedQuery({ limit: 100, vpc_id: vpcId }) },
    })),
  })
  useListErrorNotification({ id: `vpc-detail:${vpcId}`, title: `VPC 加载失败`, error: detail.error })
  useListErrorNotification({ id: `vpc-subnets:${vpcId}`, title: `子网加载失败`, error: subnets.error })
  useListErrorNotification({ id: `vpc-routes:${vpcId}`, title: `路由加载失败`, error: routes.error })
  useListErrorNotification({ id: `vpc-security-groups:${vpcId}`, title: `安全组加载失败`, error: securityGroups.error })
  useListErrorNotification({ id: `vpc-load-balancers:${vpcId}`, title: `负载均衡加载失败`, error: loadBalancers.error })
  useListErrorNotification({ id: `vpc-instances:${vpcId}`, title: `关联实例加载失败`, error: instances.error })
  const deleteVpc = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.DELETE('/networks/vpcs/{vpc_id}', {
        params: { path: { vpc_id: vpcId } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network-vpcs'] })
      navigate({ to: '/vpcs' })
    },
    onError: (error) => showApiError(error),
  })

  if (detail.isLoading && !detail.data) {
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    )
  }
  if (!detail.data)
    return (
      <DetailPagePlaceholder
        breadcrumbs={[{ label: '网络' }, { label: 'VPC', to: '/vpcs' }, { label: vpcId }]}
        title={vpcId}
        idLabel="VPC ID"
        idValue={vpcId}
      />
    )

  const vpc = detail.data as Vpc
  const vpcSubnets = (subnets.data?.items ?? []) as Subnet[]
  const vpcRoutes = (routes.data?.items ?? []) as NetworkRoute[]
  const associatedSecurityGroups = (securityGroups.data?.items ?? []) as SecurityGroup[]
  const associatedLoadBalancers = (loadBalancers.data?.items ?? []) as LoadBalancer[]
  const associatedInstances = (instances.data?.items ?? []) as Instance[]
  const relatedResources: RelatedResource[] = [
    ...vpcSubnets.map((item) => ({
      id: item.id,
      kind: '子网' as const,
      name: item.name,
      status: item.state,
      group: '网络' as const,
      route: '/subnets' as const,
    })),
    ...associatedSecurityGroups.map((item) => ({
      id: item.id,
      kind: '安全组' as const,
      name: item.name,
      status: item.state,
      group: '网络' as const,
      route: '/security-groups' as const,
    })),
    ...vpcRoutes.map((item) => ({
      id: item.id,
      kind: '路由' as const,
      name: item.description || item.destination_cidr,
      status: '-',
      group: '网络' as const,
      route: '/routes' as const,
    })),
    ...associatedLoadBalancers.map((item) => ({
      id: item.id,
      kind: '负载均衡' as const,
      name: item.name,
      status: item.state,
      group: '网络' as const,
      route: '/load-balancers/$loadBalancerId' as const,
    })),
    ...associatedInstances.map((item) => ({
      id: item.id,
      kind: '实例' as const,
      name: item.name,
      status: item.state,
      group: '算力' as const,
      route: '/compute-instances/$instanceId' as const,
    })),
  ]
  const networkRelatedResources = relatedResources.filter((resource) => resource.group === '网络')
  const computeRelatedResources = relatedResources.filter((resource) => resource.group === '算力')
  const relatedLoading =
    subnets.isLoading || securityGroups.isLoading || routes.isLoading || loadBalancers.isLoading || instances.isLoading

  const openRelatedResource = (resource: RelatedResource) => {
    if (resource.route === '/compute-instances/$instanceId') {
      navigate({ to: resource.route, params: { instanceId: resource.id } })
      return
    }
    if (resource.route === '/load-balancers/$loadBalancerId') {
      navigate({ to: resource.route, params: { loadBalancerId: resource.id } })
      return
    }
    navigate({ to: resource.route })
  }

  return (
    <DetailPageFrame
      breadcrumbs={[{ label: '网络' }, { label: 'VPC', to: '/vpcs' }, { label: vpc.name }]}
      title={vpc.name}
      status={<StatusTag status={vpc.state} />}
      icon={<AliIcon name="VPCwangluo" size={28} />}
      headerItems={[
        { label: 'VPC ID', value: vpc.id },
        { label: 'CIDR', value: vpc.cidr },
        { label: '创建时间', value: formatDateTime(vpc.created_at) },
      ]}
      actions={
        <Space>
          <Button
            status="danger"
            loading={deleteVpc.isPending}
            onClick={() =>
              Modal.confirm({
                title: '删除 VPC',
                content: `确定删除「${vpc.name}」？存在子网或关联资源时无法删除，请先清理相关资源。`,
                okButtonProps: { status: 'danger' },
                onOk: () => deleteVpc.mutateAsync(undefined),
              })
            }
          >
            删除
          </Button>
        </Space>
      }
      cards={[
        {
          key: 'basic',
          title: '基本信息',
          fields: [
            { label: 'ID', value: vpc.id },
            { label: '名称', value: vpc.name },
            { label: 'CIDR', value: vpc.cidr },
            { label: '状态', value: <StatusTag status={vpc.state} /> },
            { label: '创建时间', value: formatDateTime(vpc.created_at) },
            { label: '更新时间', value: formatDateTime(vpc.updated_at) },
          ],
        },
        {
          key: 'related-summary',
          title: '关联摘要',
          fields: relatedLoading
            ? [{ label: '加载中…', value: '-' }]
            : relatedResources.length
              ? relatedResources.slice(0, 5).map((resource) => ({
                  label: `${resource.kind} · ${resource.name}`,
                  value: (
                    <Button type="text" size="mini" onClick={() => openRelatedResource(resource)}>
                      打开
                    </Button>
                  ),
                }))
              : [{ label: '暂无关联对象', value: '-' }],
        },
      ]}
      tabs={[
        {
          key: 'subnets',
          label: '子网',
          content: (
            <DataTable<Subnet>
              columns={[
                { title: '名称', dataIndex: 'name' },
                { title: 'CIDR', dataIndex: 'cidr' },
                { title: '网关', render: (_, item) => item.gateway ?? '-' },
                { title: '状态', width: 120, render: (_, item) => <StatusTag status={item.state} /> },
              ]}
              data={vpcSubnets}
              loading={subnets.isLoading}
              pagination={false}
              noDataElement="当前 VPC 暂无子网"
            />
          ),
        },
        {
          key: 'routes',
          label: '路由',
          content: (
            <DataTable<NetworkRoute>
              columns={[
                { title: '目标 CIDR', dataIndex: 'destination_cidr' },
                { title: '下一跳类型', dataIndex: 'next_hop_type' },
                { title: '下一跳', dataIndex: 'next_hop_id' },
                { title: '描述', render: (_, item) => item.description ?? '-' },
              ]}
              data={vpcRoutes}
              loading={routes.isLoading}
              pagination={false}
              noDataElement={<Empty />}
            />
          ),
        },
        {
          key: 'related',
          label: '关联资源',
          content: (
            <Space direction="vertical" size={12} className="w-full">
              <Typography.Text>
                共 <Typography.Text bold>{relatedResources.length}</Typography.Text> 个关联对象
              </Typography.Text>
              <Card title={`网络关联 ${networkRelatedResources.length}`} size="small">
                <List
                  loading={relatedLoading}
                  dataSource={networkRelatedResources}
                  noDataElement={<Empty description="暂无网络关联资源" />}
                  render={(resource) => (
                    <div className="flex w-full items-center gap-3 px-5 py-3">
                      <Tag className="shrink-0">{resource.kind}</Tag>
                      <span className="min-w-0 flex-1 truncate">{resource.name}</span>
                      <Typography.Text className="shrink-0" type="secondary">
                        {resource.id}
                      </Typography.Text>
                      <StatusTag status={resource.status} />
                      <Button
                        className="shrink-0"
                        type="text"
                        size="mini"
                        onClick={() => openRelatedResource(resource)}
                      >
                        打开
                      </Button>
                    </div>
                  )}
                />
              </Card>
              <Card title={`算力关联 ${computeRelatedResources.length}`} size="small">
                <List
                  loading={relatedLoading}
                  dataSource={computeRelatedResources}
                  noDataElement={<Empty description="暂无算力关联资源" />}
                  render={(resource) => (
                    <div className="flex w-full items-center gap-3 px-5 py-3">
                      <Tag className="shrink-0">{resource.kind}</Tag>
                      <span className="min-w-0 flex-1 truncate">{resource.name}</span>
                      <Typography.Text className="shrink-0" type="secondary">
                        {resource.id}
                      </Typography.Text>
                      <StatusTag status={resource.status} />
                      <Button
                        className="shrink-0"
                        type="text"
                        size="mini"
                        onClick={() => openRelatedResource(resource)}
                      >
                        打开
                      </Button>
                    </div>
                  )}
                />
              </Card>
            </Space>
          ),
        },
      ]}
      onBack={() => navigate({ to: '/vpcs' })}
    />
  )
}
