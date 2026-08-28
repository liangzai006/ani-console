import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Empty, List, Modal, Spin, Tag, Typography } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import {
  DetailPageFrame,
  ApiErrorAlert,
  AliIcon,
  StatusTag,
} from '@/components/common'
import { formatDateTime } from '@/lib/format'

type NetworkRoute = components['schemas']['NetworkRoute']
type Vpc = components['schemas']['NetworkVPC']
type Instance = components['schemas']['InstanceRecord']
type RelatedResource = { id: string; kind: 'VPC' | '实例'; name: string; status: string; type: 'vpc' | 'instance' }

export const Route = createFileRoute('/_authenticated/networks/routes/$routeId')({ component: NetworkRouteDetailPage })

function NetworkRouteDetailPage() {
  const { routeId } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: ['network-route', routeId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/networks/routes/{route_id}', {
        params: { path: { route_id: routeId } },
      })
      if (error) throw error
      return data
    },
  })
  const vpc = useQuery({
    queryKey: ['network-vpc', detail.data?.vpc_id],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/networks/vpcs/{vpc_id}', {
        params: { path: { vpc_id: detail.data!.vpc_id } },
      })
      if (error) throw error
      return data
    },
    enabled: Boolean(detail.data?.vpc_id),
  })
  const instance = useQuery({
    queryKey: ['instance', 'route-next-hop', detail.data?.next_hop_id],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/instances/{instance_id}', {
        params: { path: { instance_id: detail.data!.next_hop_id } },
      })
      if (error) throw error
      return data
    },
    enabled: detail.data?.next_hop_type === 'instance' && Boolean(detail.data?.next_hop_id),
    retry: false,
  })
  const deleteRoute = useMutation({
    mutationFn: async (_: undefined) => {
      const { error } = await coreApi.DELETE('/networks/routes/{route_id}', { params: { path: { route_id: routeId } } })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network-routes'] })
      navigate({ to: '/networks/routes' })
    },
    onError: (error) => showApiError(error),
  })

  if (detail.isLoading && !detail.data)
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    )
  if (detail.error || !detail.data)
    return <ApiErrorAlert error={detail.error ?? new Error('路由不存在或无权访问')} title="路由加载失败" />
  const item = detail.data as NetworkRoute
  const parentVpc = vpc.data as Vpc | undefined
  const nextHopInstance = instance.data as Instance | undefined
  const name = item.description?.trim() || item.destination_cidr
  const relatedResources: RelatedResource[] = [
    ...(parentVpc
      ? [
          {
            id: parentVpc.id,
            kind: 'VPC' as const,
            name: parentVpc.name,
            status: parentVpc.state,
            type: 'vpc' as const,
          },
        ]
      : []),
    ...(nextHopInstance
      ? [
          {
            id: nextHopInstance.id,
            kind: '实例' as const,
            name: nextHopInstance.name,
            status: nextHopInstance.state,
            type: 'instance' as const,
          },
        ]
      : []),
  ]
  const openRelated = (resource: RelatedResource) =>
    resource.type === 'vpc'
      ? navigate({ to: '/networks/vpcs/$vpcId', params: { vpcId: resource.id } })
      : navigate({ to: '/instances/$instanceId', params: { instanceId: resource.id } })

  return (
    <DetailPageFrame
      breadcrumbs={[{ label: '网络' }, { label: '路由', to: '/networks/routes' }, { label: name }]}
      title={name}
      icon={<AliIcon name="VPCluyouqi" size={28} />}
      headerItems={[
        { label: '路由 ID', value: item.id },
        { label: '目标网段', value: item.destination_cidr },
        { label: '创建时间', value: formatDateTime(item.created_at) },
      ]}
      actions={
        <Button
          status="danger"
          loading={deleteRoute.isPending}
          onClick={() =>
            Modal.confirm({
              title: '删除路由',
              content: `确定删除「${name}」？删除后该转发规则将立即失效。`,
              okButtonProps: { status: 'danger' },
              onOk: () => deleteRoute.mutateAsync(undefined),
            })
          }
        >
          删除
        </Button>
      }
      cards={[
        {
          key: 'basic',
          title: '基本信息',
          fields: [
            { label: 'ID', value: item.id },
            { label: '名称', value: item.description?.trim() || '—' },
            { label: 'VPC', value: parentVpc?.name ?? (vpc.isLoading ? '加载中…' : item.vpc_id) },
            { label: '目标网段', value: item.destination_cidr },
            {
              label: '下一跳类型',
              value: item.next_hop_type === 'instance' ? '实例' : item.next_hop_type === 'nat' ? 'NAT' : '网关',
            },
            { label: '下一跳', value: item.next_hop_id },
            { label: '创建时间', value: formatDateTime(item.created_at) },
          ],
        },
      ]}
      tabs={[
        {
          key: 'related',
          label: '关联资源',
          content: (
            <div className="flex flex-col gap-3">
              <Typography.Text>
                共 <Typography.Text bold>{relatedResources.length}</Typography.Text> 个可确认的关联对象
              </Typography.Text>
              {vpc.error || instance.error ? <ApiErrorAlert error={vpc.error ?? instance.error} /> : null}
              <Card title={`关联资源 ${relatedResources.length}`} size="small">
                <List<RelatedResource>
                  loading={vpc.isLoading || instance.isLoading}
                  dataSource={relatedResources}
                  noDataElement={<Empty description="暂无可展示的关联资源" />}
                  render={(resource) => (
                    <div className="flex w-full items-center gap-3 px-5 py-3">
                      <Tag className="shrink-0">{resource.kind}</Tag>
                      <span className="min-w-0 flex-1 truncate">{resource.name}</span>
                      <Typography.Text className="shrink-0" type="secondary">
                        {resource.id}
                      </Typography.Text>
                      <StatusTag status={resource.status} />
                      <Button className="shrink-0" type="text" size="mini" onClick={() => openRelated(resource)}>
                        打开
                      </Button>
                    </div>
                  )}
                />
              </Card>
            </div>
          ),
        },
      ]}
      onBack={() => navigate({ to: '/networks/routes' })}
    />
  )
}
