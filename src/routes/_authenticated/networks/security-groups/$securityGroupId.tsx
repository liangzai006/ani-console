import {
  DataTable,
  DetailPageFrame,
  DetailPagePlaceholder,
  AliIcon,
  StatusTag,
} from '@/components/common'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Empty, List, Modal, Space, Spin, Tag, Typography } from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { SecurityGroupRuleModal, type SecurityGroupRuleResource } from '@/components/network/SecurityGroupRuleModal'
import { formatDateTime } from '@/lib/format'
import { listOrThrow } from '@/lib/api-list'
import { useListErrorNotification } from '@/hooks/useListErrorNotification'

type SecurityGroup = components['schemas']['NetworkSecurityGroup']
type SecurityGroupBinding = components['schemas']['NetworkSecurityGroupBinding']
type Vpc = components['schemas']['NetworkVPC']
type Instance = components['schemas']['InstanceRecord']

type RelatedResource = {
  key: string
  id: string
  kind: 'VPC' | '实例'
  name: string
  status: string
  route: '/networks/vpcs/$vpcId' | '/instances/$instanceId'
}

export const Route = createFileRoute('/_authenticated/networks/security-groups/$securityGroupId')({
  component: SecurityGroupDetailPage,
})

function SecurityGroupDetailPage() {
  const { securityGroupId } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [ruleEditor, setRuleEditor] = useState<{
    direction: SecurityGroupRuleResource['direction']
    rule?: SecurityGroupRuleResource
  } | null>(null)
  const detail = useQuery({
    queryKey: ['network-security-group', securityGroupId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/networks/security-groups/{security_group_id}', {
        params: { path: { security_group_id: securityGroupId } },
      })
      if (error) throw error
      return data
    },
  })
  const vpc = useQuery({
    queryKey: ['network-vpc', detail.data?.vpc_id],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/networks/vpcs/{vpc_id}', {
        params: { path: { vpc_id: detail.data!.vpc_id! } },
      })
      if (error) throw error
      return data
    },
    enabled: Boolean(detail.data?.vpc_id),
  })
  const bindings = useQuery({
    queryKey: ['network-security-group-bindings', securityGroupId],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET('/networks/security-groups/{security_group_id}/bindings', {
          params: { path: { security_group_id: securityGroupId }, query: { limit: 100 } },
        }),
      ),
  })
  const rules = useQuery({
    queryKey: ['network-security-group-rules', securityGroupId],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET('/networks/security-groups/{security_group_id}/rules', {
          params: { path: { security_group_id: securityGroupId }, query: { limit: 100 } },
        }),
      ),
  })
  const instances = useQuery({
    queryKey: ['instances', 'security-group-related'],
    queryFn: () => listOrThrow(() => coreApi.GET('/instances', { params: { query: { limit: 100 } } })),
  })
  useListErrorNotification({ id: `security-group-detail:${securityGroupId}`, title: '安全组加载失败', error: detail.error })
  useListErrorNotification({ id: `security-group-vpc:${securityGroupId}`, title: 'VPC 加载失败', error: vpc.error })
  useListErrorNotification({ id: `security-group-bindings:${securityGroupId}`, title: '安全组绑定加载失败', error: bindings.error })
  useListErrorNotification({ id: `security-group-rules:${securityGroupId}`, title: '安全组规则加载失败', error: rules.error })
  useListErrorNotification({ id: `security-group-instances:${securityGroupId}`, title: '关联实例加载失败', error: instances.error })
  const deleteRule = useMutation({
    mutationFn: async (rule: SecurityGroupRuleResource) => {
      const { error } = await coreApi.DELETE('/networks/security-groups/{security_group_id}/rules/{rule_id}', {
        params: { path: { security_group_id: securityGroupId, rule_id: rule.id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network-security-group-rules', securityGroupId] })
      qc.invalidateQueries({ queryKey: ['network-security-group', securityGroupId] })
      qc.invalidateQueries({ queryKey: ['network-security-groups'] })
    },
    onError: (error) => showApiError(error),
  })
  const deleteSecurityGroup = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.DELETE('/networks/security-groups/{security_group_id}', {
        params: { path: { security_group_id: securityGroupId } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network-security-groups'] })
      navigate({ to: '/networks/security-groups' })
    },
    onError: (error) => showApiError(error),
  })

  if (detail.isLoading && !detail.data)
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    )
  if (!detail.data)
    return (
      <DetailPagePlaceholder
        breadcrumbs={[{ label: '网络' }, { label: '安全组', to: '/networks/security-groups' }, { label: securityGroupId }]}
        title={securityGroupId}
        idLabel="安全组 ID"
        idValue={securityGroupId}
      />
    )

  const securityGroup = detail.data as SecurityGroup
  const parentVpc = vpc.data as Vpc | undefined
  const securityGroupBindings = (bindings.data?.items ?? []) as SecurityGroupBinding[]
  const instanceById = new Map(((instances.data?.items ?? []) as Instance[]).map((instance) => [instance.id, instance]))
  const networkRelatedResources: RelatedResource[] = parentVpc
    ? [
        {
          key: `vpc-${parentVpc.id}`,
          id: parentVpc.id,
          kind: 'VPC',
          name: parentVpc.name,
          status: parentVpc.state,
          route: '/networks/vpcs/$vpcId',
        },
      ]
    : []
  const computeRelatedResources: RelatedResource[] = securityGroupBindings
    .filter((binding) => binding.target_type === 'instance')
    .map((binding) => {
      const instance = instanceById.get(binding.target_id)
      return {
        key: binding.id,
        id: binding.target_id,
        kind: '实例',
        name: instance?.name ?? binding.target_id,
        status: instance?.state ?? '—',
        route: '/instances/$instanceId',
      }
    })
  const openRelatedResource = (resource: RelatedResource) => {
    if (resource.route === '/instances/$instanceId') {
      navigate({ to: resource.route, params: { instanceId: resource.id } })
      return
    }
    navigate({ to: resource.route, params: { vpcId: resource.id } })
  }
  const renderRelatedList = (items: RelatedResource[], emptyText: string) => (
    <List<RelatedResource>
      loading={bindings.isLoading || instances.isLoading || vpc.isLoading}
      dataSource={items}
      noDataElement={<Empty description={emptyText} />}
      render={(resource) => (
        <div className="flex w-full items-center gap-3 px-5 py-3">
          <Tag className="shrink-0">{resource.kind}</Tag>
          <span className="min-w-0 flex-1 truncate">{resource.name}</span>
          <Typography.Text className="shrink-0" type="secondary">
            {resource.id}
          </Typography.Text>
          <StatusTag status={resource.status} />
          <Button className="shrink-0" type="text" size="mini" onClick={() => openRelatedResource(resource)}>
            打开
          </Button>
        </div>
      )}
    />
  )
  const ruleItems = (rules.data?.items ?? []) as SecurityGroupRuleResource[]
  const renderRuleTable = (direction: SecurityGroupRuleResource['direction']) => {
    const directionRules = ruleItems.filter((rule) => rule.direction === direction)
    return (
      <Space direction="vertical" size={12} className="w-full">
        <div className="flex items-center justify-between">
          <Typography.Text>
            共 <Typography.Text bold>{directionRules.length}</Typography.Text> 条
            {direction === 'ingress' ? '入站' : '出站'}规则
          </Typography.Text>
          <Button type="primary" onClick={() => setRuleEditor({ direction })}>
            添加规则
          </Button>
        </div>
        <DataTable<SecurityGroupRuleResource>
          loading={rules.isLoading}
          columns={[
            { title: '优先级', dataIndex: 'priority' },
            { title: '协议', render: (_, rule) => (rule.protocol === 'all' ? '全部' : rule.protocol.toUpperCase()) },
            { title: '端口范围', dataIndex: 'port_range' },
            { title: direction === 'ingress' ? '来源 CIDR' : '目标 CIDR', dataIndex: 'cidr' },
            {
              title: '策略',
              render: (_, rule) => (
                <Tag color={rule.action === 'allow' ? 'green' : 'red'}>{rule.action === 'allow' ? '允许' : '拒绝'}</Tag>
              ),
            },
            { title: '描述', render: (_, rule) => rule.description || '—' },
            {
              title: '操作',
              render: (_, rule) => (
                <Space>
                  <Button type="text" size="mini" onClick={() => setRuleEditor({ direction, rule })}>
                    编辑
                  </Button>
                  <Button
                    type="text"
                    size="mini"
                    status="danger"
                    onClick={() =>
                      Modal.confirm({
                        title: '删除规则',
                        content: '确定删除这条安全组规则？',
                        okButtonProps: { status: 'danger' },
                        onOk: () => deleteRule.mutateAsync(rule),
                      })
                    }
                  >
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
          data={directionRules}
          pagination={false}
          noDataElement={<Empty description={`暂无${direction === 'ingress' ? '入站' : '出站'}规则`} />}
        />
      </Space>
    )
  }

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: '网络' },
          { label: '安全组', to: '/networks/security-groups' },
          { label: securityGroup.name },
        ]}
        title={securityGroup.name}
        status={<StatusTag status={securityGroup.state} />}
        icon={<AliIcon name="anquanzu" size={28} />}
        headerItems={[
          { label: '安全组 ID', value: securityGroup.id },
          { label: 'VPC', value: parentVpc?.name ?? securityGroup.vpc_id ?? '—' },
          { label: '创建时间', value: formatDateTime(securityGroup.created_at) },
        ]}
        actions={
          <Button
            status="danger"
            loading={deleteSecurityGroup.isPending}
            onClick={() =>
              Modal.confirm({
                title: '删除安全组',
                content: `确定删除「${securityGroup.name}」？安全组被实例使用时无法删除，请先解除关联。`,
                okButtonProps: { status: 'danger' },
                onOk: () => deleteSecurityGroup.mutateAsync(),
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
              { label: 'ID', value: securityGroup.id },
              { label: '名称', value: securityGroup.name },
              { label: 'VPC', value: parentVpc?.name ?? securityGroup.vpc_id ?? '—' },
              { label: '描述', value: securityGroup.description || '—' },
              { label: '状态', value: <StatusTag status={securityGroup.state} /> },
              { label: '创建时间', value: formatDateTime(securityGroup.created_at) },
              { label: '更新时间', value: formatDateTime(securityGroup.updated_at) },
            ],
          },
        ]}
        tabs={[
          { key: 'ingress', label: '入站规则', content: renderRuleTable('ingress') },
          { key: 'egress', label: '出站规则', content: renderRuleTable('egress') },
          {
            key: 'related',
            label: '关联资源',
            content: (
              <Space direction="vertical" size={12} className="w-full">
                <Typography.Text>
                  共{' '}
                  <Typography.Text bold>
                    {networkRelatedResources.length + computeRelatedResources.length}
                  </Typography.Text>{' '}
                  个关联对象
                </Typography.Text>
                <Card title={`网络关联 ${networkRelatedResources.length}`} size="small">
                  {renderRelatedList(networkRelatedResources, '暂无网络关联资源')}
                </Card>
                <Card title={`算力关联 ${computeRelatedResources.length}`} size="small">
                  {renderRelatedList(computeRelatedResources, '暂无算力关联资源')}
                </Card>
              </Space>
            ),
          },
        ]}
        onBack={() => navigate({ to: '/networks/security-groups' })}
      />
      <SecurityGroupRuleModal
        visible={Boolean(ruleEditor)}
        securityGroupId={securityGroupId}
        direction={ruleEditor?.direction ?? 'ingress'}
        rule={ruleEditor?.rule}
        onCancel={() => setRuleEditor(null)}
      />
    </>
  )
}
