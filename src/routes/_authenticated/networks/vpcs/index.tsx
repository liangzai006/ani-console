import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, Input, Modal, Typography } from '@arco-design/web-react'
import { useEffect, useMemo, useState } from 'react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { Ipv4CidrInput } from '@/components/forms/Ipv4CidrInput'
import {
  DataTable,
  ListNameCell,
  ListPageFrame,
  ListPageHeader,
  ListRowActionButton,
  ListRowActions,
  ListToolbar,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from '@/components/pagebase'
import { StatusTag } from '@/components/shell/StatusTag'
import { formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { newIdempotencyKey } from '@/lib/idempotency'
import { listOrThrow } from '@/lib/api-list'
import { ipv4CidrError, requireIpv4Cidr } from '@/lib/validators'

type Vpc = components['schemas']['NetworkVPC']
type Subnet = components['schemas']['NetworkSubnet']
type NetworkRoute = components['schemas']['NetworkRoute']
type VpcStatusFilter = 'all' | Vpc['state']
type VpcSearchField = 'name' | 'id'

export const Route = createFileRoute('/_authenticated/networks/vpcs/')({ component: VpcsPage })

function VpcsPage() {
  const navigate = useNavigate()
  return <VpcList onSelect={(vpcId) => navigate({ to: '/networks/vpcs/$vpcId', params: { vpcId } })} />
}

function VpcList({ onSelect }: { onSelect: (vpcId: string) => void }) {
  const qc = useQueryClient()
  const [createVisible, setCreateVisible] = useState(false)
  const [name, setName] = useState('')
  const [cidr, setCidr] = useState('10.0.0.0/16')
  const [status, setStatus] = useState<VpcStatusFilter>('all')
  const [searchField, setSearchField] = useState<VpcSearchField>('name')
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const cidrError = ipv4CidrError(cidr, 'IPv4 CIDR')

  const vpcs = useQuery({
    queryKey: ['network-vpcs'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/vpcs', { params: { query: { limit: 50 } } })),
  })
  const subnets = useQuery({
    queryKey: ['network-subnets', 'vpc-counts'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/subnets', { params: { query: { limit: 100 } } })),
  })
  const routes = useQuery({
    queryKey: ['network-routes', 'vpc-counts'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/routes', { params: { query: { limit: 100 } } })),
  })

  const createVpc = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('请输入 VPC 名称')
      const { error } = await coreApi.POST('/networks/vpcs', {
        body: { name: trimmedName, cidr: requireIpv4Cidr(cidr, 'IPv4 CIDR'), idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setCreateVisible(false)
      setName('')
      setCidr('10.0.0.0/16')
      qc.invalidateQueries({ queryKey: ['network-vpcs'] })
    },
    onError: (error) => showApiError(error),
  })

  const deleteVpc = useMutation({
    mutationFn: async (vpc: Vpc) => {
      const { error } = await coreApi.DELETE('/networks/vpcs/{vpc_id}', { params: { path: { vpc_id: vpc.id } } })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network-vpcs'] })
      qc.invalidateQueries({ queryKey: ['network-subnets'] })
      qc.invalidateQueries({ queryKey: ['network-routes'] })
    },
    onError: (error) => showApiError(error),
  })

  const items = (vpcs.data?.items ?? []) as Vpc[]
  const subnetCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const subnet of (subnets.data?.items ?? []) as Subnet[]) counts.set(subnet.vpc_id, (counts.get(subnet.vpc_id) ?? 0) + 1)
    return counts
  }, [subnets.data?.items])
  const routeTableNames = useMemo(() => {
    const names = new Map<string, string[]>()
    for (const route of (routes.data?.items ?? []) as NetworkRoute[]) {
      names.set(route.vpc_id, [...(names.get(route.vpc_id) ?? []), route.description?.trim() || route.id])
    }
    return names
  }, [routes.data?.items])
  const statusCounts = useMemo(() => ({
    all: items.length,
    available: items.filter((item) => item.state === 'available').length,
    pending: items.filter((item) => item.state === 'pending').length,
    failed: items.filter((item) => item.state === 'failed').length,
  }), [items])
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    return items.filter((item) => {
      if (status !== 'all' && item.state !== status) return false
      return !keyword || item[searchField].toLowerCase().includes(keyword)
    })
  }, [items, searchField, searchText, status])
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [searchField, searchText, status])

  const columns: Array<ListColumn<Vpc>> = [
    {
      key: 'name', title: '名称 / ID', minWidth: 240,
      render: (vpc) => <ListNameCell name={<Link to="/networks/vpcs/$vpcId" params={{ vpcId: vpc.id }}>{vpc.name}</Link>} id={vpc.id} />,
    },
    { key: 'state', title: '状态', width: 120, render: (vpc) => <StatusTag status={vpc.state} /> },
    { key: 'cidr', title: 'CIDR', minWidth: 160, render: (vpc) => vpc.cidr },
    { key: 'subnets', title: '子网数', width: 110, render: (vpc) => subnets.isError ? '—' : subnetCounts.get(vpc.id) ?? 0 },
    { key: 'routeTable', title: '路由表', minWidth: 160, render: (vpc) => routes.isError ? '—' : routeTableNames.get(vpc.id)?.join('、') || '—' },
    { key: 'createdAt', title: '创建时间', minWidth: 190, render: (vpc) => formatDateTime(vpc.created_at) },
  ]

  return (
    <>
      <ListPageFrame
        header={<ListPageHeader iconClassName="icon-VPCwangluo" title="VPC" subtitle="创建和管理相互隔离的虚拟私有云网络" extra={<ToolbarButton variant="primary" iconClassName="icon-add-1" onClick={() => setCreateVisible(true)}>创建 VPC</ToolbarButton>} />}
        tabs={<StatusTabs value={status} onChange={setStatus} items={[
          { value: 'all', label: '全部', count: statusCounts.all },
          { value: 'available', label: '可用', count: statusCounts.available },
          { value: 'pending', label: '创建中', count: statusCounts.pending },
          { value: 'failed', label: '异常', count: statusCounts.failed },
        ]} />}
        toolbar={<ListToolbar filters={<ToolbarSearch fields={[{ value: 'name', label: '名称' }, { value: 'id', label: 'ID' }]} field={searchField} value={searchText} onFieldChange={setSearchField} onChange={setSearchText} />} tools={<ToolbarIconButton iconClassName="icon-refresh-1" label="刷新" spinning={vpcs.isFetching} onClick={() => void Promise.all([vpcs.refetch(), subnets.refetch(), routes.refetch()])} />} />}
      >
        <DataTable
          rows={pagedItems}
          rowKey={(vpc) => vpc.id}
          columns={columns}
          selectable={false}
          loading={vpcs.isLoading}
          error={vpcs.error ? getErrorMessage(vpcs.error, 'VPC 列表加载失败') : null}
          onRetry={() => void vpcs.refetch()}
          emptyIconClassName="icon-VPCwangluo"
          emptyText={searchText || status !== 'all' ? '没有符合条件的 VPC' : '还没有 VPC，点击「创建 VPC」开始'}
          tableLabel="VPC 列表"
          preserveTableOnEmpty
          renderRowActions={(vpc) => <ListRowActions>
            <ListRowActionButton onClick={() => onSelect(vpc.id)}>详情</ListRowActionButton>
            <ListRowActionButton status="danger" onClick={() => Modal.confirm({ title: '删除 VPC', content: `确定删除「${vpc.name}」？存在子网或关联资源时无法删除，请先清理相关资源。`, okButtonProps: { status: 'danger' }, onOk: () => deleteVpc.mutateAsync(vpc) })}>删除</ListRowActionButton>
          </ListRowActions>}
          pagination={{ page, pageSize, total: filteredItems.length, onPageChange: setPage, onPageSizeChange: (nextPageSize) => { setPageSize(nextPageSize); setPage(1) } }}
        />
      </ListPageFrame>
      <Modal visible={createVisible} title="创建 VPC" onCancel={() => setCreateVisible(false)} onOk={() => createVpc.mutateAsync(undefined)} confirmLoading={createVpc.isPending} unmountOnExit>
        <Form layout="vertical">
          <Form.Item label="名称" required><Input value={name} onChange={setName} placeholder="请输入 VPC 名称" maxLength={64} showWordLimit /></Form.Item>
          <Form.Item label="IPv4 CIDR" required validateStatus={cidrError ? 'error' : undefined} help={cidrError}><Ipv4CidrInput value={cidr} onChange={setCidr} placeholder="10.0.0.0" withPrefix /></Form.Item>
          <Typography.Text type="secondary">CIDR 不能与租户下已有 VPC 网段重叠；创建后不可修改。</Typography.Text>
        </Form>
      </Modal>
    </>
  )
}
