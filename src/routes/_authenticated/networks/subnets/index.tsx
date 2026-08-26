import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, Input, Modal, Select } from '@arco-design/web-react'
import { useEffect, useMemo, useState } from 'react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { Ipv4CidrInput } from '@/components/common/Ipv4CidrInput'
import { DataTable, ListNameCell, ListPageFrame, ListPageHeader, ListRowActionButton, ListRowActions, ListToolbar, StatusTabs, ToolbarButton, ToolbarIconButton, ToolbarSearch, type ListColumn } from '@/components/common'
import { StatusTag } from '@/components/common/StatusTag'
import { formatDateTime } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { newIdempotencyKey } from '@/lib/idempotency'
import { listOrThrow } from '@/lib/api-list'
import { ipv4CidrWithinError, optionalIpv4Error, optionalIpv4WithinCidr, optionalIpv4WithinCidrError, requireIpv4CidrWithin, subnetFixedOctets, suggestGatewayIp, suggestSubnetCidr } from '@/lib/validators'

type Vpc = components['schemas']['NetworkVPC']
type Subnet = components['schemas']['NetworkSubnet']
type SubnetStatusFilter = 'all' | Subnet['state']
type SubnetSearchField = 'name' | 'id'

export const Route = createFileRoute('/_authenticated/networks/subnets/')({ component: SubnetsPage })

function SubnetsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [createVisible, setCreateVisible] = useState(false)
  const [name, setName] = useState('')
  const [vpcId, setVpcId] = useState('')
  const [cidr, setCidr] = useState('10.0.1.0/24')
  const [gateway, setGateway] = useState('')
  const [status, setStatus] = useState<SubnetStatusFilter>('all')
  const [searchField, setSearchField] = useState<SubnetSearchField>('name')
  const [searchText, setSearchText] = useState('')
  const [filterVpcId, setFilterVpcId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const vpcs = useQuery({
    queryKey: ['network-vpcs', 'subnet-page'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/vpcs', { params: { query: { limit: 100 } } })),
  })
  const subnets = useQuery({
    queryKey: ['network-subnets'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/subnets', { params: { query: { limit: 100 } } })),
  })
  const selectedVpc = ((vpcs.data?.items ?? []) as Vpc[]).find((vpc) => vpc.id === vpcId)
  const selectedVpcCidr = selectedVpc?.cidr ?? ''
  const cidrError = selectedVpcCidr ? ipv4CidrWithinError(cidr, selectedVpcCidr, 'CIDR', 'VPC CIDR') : undefined
  const gatewayError = cidr ? optionalIpv4WithinCidrError(gateway, cidr, '网关', 'CIDR') : optionalIpv4Error(gateway, '网关')
  const fixedOctets = selectedVpcCidr ? subnetFixedOctets(selectedVpcCidr) : []
  const selectedVpcPrefix = selectedVpcCidr ? Number(selectedVpcCidr.split('/')[1]) : 0

  const resetCreateForm = () => {
    setName('')
    setVpcId('')
    setCidr('10.0.1.0/24')
    setGateway('')
  }
  const setSubnetCidr = (nextCidr: string) => {
    setCidr(nextCidr)
    try { setGateway(suggestGatewayIp(nextCidr)) } catch { /* Keep the last valid gateway while editing. */ }
  }
  const createSubnet = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('请输入子网名称')
      if (!selectedVpcCidr) throw new Error('请选择 VPC')
      const { error } = await coreApi.POST('/networks/subnets', { body: { name: trimmedName, vpc_id: vpcId, cidr: requireIpv4CidrWithin(cidr, selectedVpcCidr, 'CIDR', 'VPC CIDR'), gateway: optionalIpv4WithinCidr(gateway, cidr, '网关', 'CIDR'), idempotency_key: newIdempotencyKey() } })
      if (error) throw error
    },
    onSuccess: () => { setCreateVisible(false); resetCreateForm(); qc.invalidateQueries({ queryKey: ['network-subnets'] }) },
    onError: (error) => showApiError(error),
  })
  const deleteSubnet = useMutation({
    mutationFn: async (subnet: Subnet) => {
      const { error } = await coreApi.DELETE('/networks/subnets/{subnet_id}', { params: { path: { subnet_id: subnet.id } } })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['network-subnets'] }),
    onError: (error) => showApiError(error),
  })

  const items = (subnets.data?.items ?? []) as Subnet[]
  const vpcNames = useMemo(() => new Map(((vpcs.data?.items ?? []) as Vpc[]).map((vpc) => [vpc.id, vpc.name])), [vpcs.data?.items])
  const statusCounts = useMemo(() => ({ all: items.length, available: items.filter((item) => item.state === 'available').length, pending: items.filter((item) => item.state === 'pending').length, failed: items.filter((item) => item.state === 'failed').length }), [items])
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    return items.filter((item) => (status === 'all' || item.state === status) && (!filterVpcId || item.vpc_id === filterVpcId) && (!keyword || item[searchField].toLowerCase().includes(keyword)))
  }, [filterVpcId, items, searchField, searchText, status])
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => setPage(1), [filterVpcId, searchField, searchText, status])

  const columns: Array<ListColumn<Subnet>> = [
    { key: 'name', title: '名称 / ID', minWidth: 230, render: (subnet) => <ListNameCell name={<Link to="/networks/subnets/$subnetId" params={{ subnetId: subnet.id }}>{subnet.name}</Link>} id={subnet.id} /> },
    { key: 'state', title: '状态', width: 120, render: (subnet) => <StatusTag status={subnet.state} /> },
    { key: 'vpc', title: 'VPC', minWidth: 180, render: (subnet) => <Link to="/networks/vpcs/$vpcId" params={{ vpcId: subnet.vpc_id }}>{vpcNames.get(subnet.vpc_id) ?? subnet.vpc_id}</Link> },
    { key: 'cidr', title: 'CIDR', minWidth: 150, render: (subnet) => subnet.cidr },
    { key: 'gateway', title: '网关', minWidth: 150, render: (subnet) => subnet.gateway ?? '—' },
    { key: 'createdAt', title: '创建时间', minWidth: 190, render: (subnet) => formatDateTime(subnet.created_at) },
  ]

  return <>
    <ListPageFrame
      header={<ListPageHeader iconClassName="icon-VPCwangluo" title="子网" subtitle="在 VPC 内划分相互隔离的私有网络地址空间" extra={<ToolbarButton variant="primary" iconClassName="icon-add-1" onClick={() => setCreateVisible(true)}>创建子网</ToolbarButton>} />}
      tabs={<StatusTabs value={status} onChange={setStatus} items={[{ value: 'all', label: '全部', count: statusCounts.all }, { value: 'available', label: '可用', count: statusCounts.available }, { value: 'pending', label: '创建中', count: statusCounts.pending }, { value: 'failed', label: '异常', count: statusCounts.failed }]} />}
      toolbar={<ListToolbar filters={<div className="flex flex-wrap gap-3"><ToolbarSearch fields={[{ value: 'name', label: '名称' }, { value: 'id', label: 'ID' }]} field={searchField} value={searchText} onFieldChange={setSearchField} onChange={setSearchText} /><Select aria-label="按 VPC 筛选" value={filterVpcId || undefined} onChange={setFilterVpcId} allowClear placeholder="全部 VPC" loading={vpcs.isLoading} style={{ width: 220 }}>{((vpcs.data?.items ?? []) as Vpc[]).map((vpc) => <Select.Option key={vpc.id} value={vpc.id}>{vpc.name}</Select.Option>)}</Select></div>} tools={<ToolbarIconButton iconClassName="icon-refresh-1" label="刷新" spinning={subnets.isFetching || vpcs.isFetching} onClick={() => void Promise.all([subnets.refetch(), vpcs.refetch()])} />} />}
    >
      <DataTable rows={pagedItems} rowKey={(subnet) => subnet.id} columns={columns} selectable={false} loading={subnets.isLoading} error={subnets.error ? getErrorMessage(subnets.error, '子网列表加载失败') : null} onRetry={() => void subnets.refetch()} emptyIconClassName="icon-VPCwangluo" emptyText={searchText || filterVpcId || status !== 'all' ? '没有符合条件的子网' : '还没有子网，点击「创建子网」开始'} tableLabel="子网列表" preserveTableOnEmpty renderRowActions={(subnet) => <ListRowActions><ListRowActionButton onClick={() => navigate({ to: '/networks/subnets/$subnetId', params: { subnetId: subnet.id } })}>详情</ListRowActionButton><ListRowActionButton status="danger" onClick={() => Modal.confirm({ title: '删除子网', content: `确定删除「${subnet.name}」？存在关联实例时无法删除，请先清理相关资源。`, okButtonProps: { status: 'danger' }, onOk: () => deleteSubnet.mutateAsync(subnet) })}>删除</ListRowActionButton></ListRowActions>} pagination={{ page, pageSize, total: filteredItems.length, onPageChange: setPage, onPageSizeChange: (nextPageSize) => { setPageSize(nextPageSize); setPage(1) } }} />
    </ListPageFrame>
    <Modal visible={createVisible} title="创建子网" onCancel={() => { setCreateVisible(false); resetCreateForm() }} onOk={() => createSubnet.mutateAsync()} confirmLoading={createSubnet.isPending} unmountOnExit>
      <Form layout="vertical">
        <Form.Item label="名称" required><Input value={name} onChange={setName} placeholder="请输入子网名称" maxLength={64} showWordLimit /></Form.Item>
        <Form.Item label="VPC" required><Select value={vpcId || undefined} onChange={(nextVpcId) => { setVpcId(nextVpcId); const vpc = ((vpcs.data?.items ?? []) as Vpc[]).find((item) => item.id === nextVpcId); if (vpc) setSubnetCidr(suggestSubnetCidr(vpc.cidr)) }} loading={vpcs.isLoading} placeholder="选择 VPC">{((vpcs.data?.items ?? []) as Vpc[]).map((vpc) => <Select.Option key={vpc.id} value={vpc.id}>{vpc.name} · {vpc.cidr}</Select.Option>)}</Select></Form.Item>
        <Form.Item label="CIDR" required validateStatus={cidrError ? 'error' : undefined} help={cidrError}><Ipv4CidrInput value={cidr} onChange={setSubnetCidr} placeholder="10.0.1.0" withPrefix disabledOctets={fixedOctets} minPrefix={selectedVpcPrefix} /></Form.Item>
        <Form.Item label="网关" validateStatus={gatewayError ? 'error' : undefined} help={gatewayError}><Ipv4CidrInput value={gateway} onChange={setGateway} placeholder="10.0.1.1" /></Form.Item>
      </Form>
    </Modal>
  </>
}
