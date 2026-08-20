import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, Select } from '@arco-design/web-react'
import { useEffect, useMemo, useState } from 'react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { CreateRouteModal } from '@/components/network/CreateRouteModal'
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
import { listOrThrow } from '@/lib/api-list'
import { getErrorMessage } from '@/lib/errors'

type NetworkRoute = components['schemas']['NetworkRoute']
type Vpc = components['schemas']['NetworkVPC']
type SearchField = 'description' | 'id'
type StatusFilter = 'all' | 'available'

export const Route = createFileRoute('/_authenticated/networks/routes/')({ component: NetworkRoutesPage })

function NetworkRoutesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [createVisible, setCreateVisible] = useState(false)
  const [searchField, setSearchField] = useState<SearchField>('description')
  const [searchText, setSearchText] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [filterVpcId, setFilterVpcId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const routes = useQuery({
    queryKey: ['network-routes'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/routes', { params: { query: { limit: 100 } } })),
  })
  const vpcs = useQuery({
    queryKey: ['network-vpcs', 'route-list'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/vpcs', { params: { query: { limit: 100 } } })),
  })
  const deleteRoute = useMutation({
    mutationFn: async (item: NetworkRoute) => {
      const { error } = await coreApi.DELETE('/networks/routes/{route_id}', { params: { path: { route_id: item.id } } })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['network-routes'] }),
    onError: (error) => showApiError(error),
  })

  const items = (routes.data?.items ?? []) as NetworkRoute[]
  const vpcNames = useMemo(
    () => new Map(((vpcs.data?.items ?? []) as Vpc[]).map((vpc) => [vpc.id, vpc.name])),
    [vpcs.data?.items],
  )
  const statusCounts = useMemo(() => ({ all: items.length, available: items.length }), [items.length])
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    return items.filter(
      (item) =>
        (!filterVpcId || item.vpc_id === filterVpcId) &&
        (!keyword ||
          String(item[searchField] ?? '')
            .toLowerCase()
            .includes(keyword)),
    )
  }, [filterVpcId, items, searchField, searchText])
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => setPage(1), [filterVpcId, searchField, searchText, status])
  const columns: Array<ListColumn<NetworkRoute>> = [
    {
      key: 'name',
      title: '名称 / ID',
      minWidth: 240,
      render: (item) => (
        <ListNameCell
          name={
            <Link to="/networks/routes/$routeId" params={{ routeId: item.id }}>
              {item.description?.trim() || item.destination_cidr}
            </Link>
          }
          id={item.id}
        />
      ),
    },
    {
      key: 'vpc',
      title: 'VPC',
      minWidth: 180,
      render: (item) => (
        <Link to="/networks/vpcs/$vpcId" params={{ vpcId: item.vpc_id }}>
          {vpcNames.get(item.vpc_id) ?? item.vpc_id}
        </Link>
      ),
    },
    { key: 'destination', title: '目标网段', minWidth: 160, render: (item) => item.destination_cidr },
    { key: 'nextHop', title: '下一跳', minWidth: 180, render: (item) => item.next_hop_id },
    {
      key: 'nextHopType',
      title: '类型',
      width: 120,
      render: (item) => (item.next_hop_type === 'instance' ? '实例' : item.next_hop_type === 'nat' ? 'NAT' : '网关'),
    },
    { key: 'priority', title: '下一跳优先级', width: 140, render: () => '—' },
  ]

  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-VPCluyouqi"
            title="路由"
            subtitle="管理 VPC 的自定义流量转发规则"
            extra={
              <ToolbarButton variant="primary" iconClassName="icon-add-1" onClick={() => setCreateVisible(true)}>
                创建路由
              </ToolbarButton>
            }
          />
        }
        tabs={
          <StatusTabs
            value={status}
            onChange={setStatus}
            items={[
              { value: 'all', label: '全部', count: statusCounts.all },
              { value: 'available', label: '可用', count: statusCounts.available },
            ]}
          />
        }
        toolbar={
          <ListToolbar
            filters={
              <div className="flex flex-wrap gap-3">
                <ToolbarSearch
                  fields={[
                    { value: 'description', label: '名称' },
                    { value: 'id', label: 'ID' },
                  ]}
                  field={searchField}
                  value={searchText}
                  onFieldChange={setSearchField}
                  onChange={setSearchText}
                />
                <Select
                  aria-label="按 VPC 筛选"
                  value={filterVpcId || undefined}
                  onChange={setFilterVpcId}
                  allowClear
                  placeholder="全部 VPC"
                  loading={vpcs.isLoading}
                  style={{ width: 220 }}
                >
                  {((vpcs.data?.items ?? []) as Vpc[]).map((vpc) => (
                    <Select.Option key={vpc.id} value={vpc.id}>
                      {vpc.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={routes.isFetching || vpcs.isFetching}
                onClick={() => void Promise.all([routes.refetch(), vpcs.refetch()])}
              />
            }
          />
        }
      >
        <DataTable
          rows={pagedItems}
          rowKey={(item) => item.id}
          columns={columns}
          selectable={false}
          loading={routes.isLoading}
          error={routes.error ? getErrorMessage(routes.error, '路由列表加载失败') : null}
          onRetry={() => void routes.refetch()}
          emptyIconClassName="icon-VPCluyouqi"
          emptyText={searchText || filterVpcId ? '没有符合条件的路由' : '还没有自定义路由，点击「创建路由」开始'}
          tableLabel="路由列表"
          preserveTableOnEmpty
          renderRowActions={(item) => (
            <ListRowActions>
              <ListRowActionButton
                onClick={() => navigate({ to: '/networks/routes/$routeId', params: { routeId: item.id } })}
              >
                详情
              </ListRowActionButton>
              <ListRowActionButton
                status="danger"
                onClick={() =>
                  Modal.confirm({
                    title: '删除路由',
                    content: `确定删除「${item.description?.trim() || item.destination_cidr}」？删除后该转发规则将立即失效。`,
                    okButtonProps: { status: 'danger' },
                    onOk: () => deleteRoute.mutateAsync(item),
                  })
                }
              >
                删除
              </ListRowActionButton>
            </ListRowActions>
          )}
          pagination={{
            page,
            pageSize,
            total: filteredItems.length,
            onPageChange: setPage,
            onPageSizeChange: (next) => {
              setPageSize(next)
              setPage(1)
            },
          }}
        />
      </ListPageFrame>
      <CreateRouteModal visible={createVisible} onCancel={() => setCreateVisible(false)} />
    </>
  )
}
