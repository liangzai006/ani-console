import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dropdown, Menu, Modal, Select } from '@arco-design/web-react'
import { useEffect, useMemo, useState } from 'react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { CreateLoadBalancerModal } from '@/components/network/CreateLoadBalancerModal'
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
import { listOrThrow } from '@/lib/api-list'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'

type LoadBalancer = components['schemas']['NetworkLoadBalancer']
type Vpc = components['schemas']['NetworkVPC']
type StatusFilter = 'all' | 'running' | 'error'
type SearchField = 'name' | 'id'

export const Route = createFileRoute('/_authenticated/networks/load-balancers/')({ component: LoadBalancersPage })

function LoadBalancersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [createVisible, setCreateVisible] = useState(false)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [searchField, setSearchField] = useState<SearchField>('name')
  const [searchText, setSearchText] = useState('')
  const [vpcId, setVpcId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const loadBalancers = useQuery({
    queryKey: ['network-load-balancers'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/load-balancers', { params: { query: { limit: 100 } } })),
  })
  const vpcs = useQuery({
    queryKey: ['network-vpcs', 'load-balancer-list'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/vpcs', { params: { query: { limit: 100 } } })),
  })
  const deleteLoadBalancer = useMutation({
    mutationFn: async (item: LoadBalancer) => {
      const { error } = await coreApi.DELETE('/networks/load-balancers/{load_balancer_id}', {
        params: { path: { load_balancer_id: item.id } },
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['network-load-balancers'] }),
    onError: (error) => showApiError(error),
  })
  const items = (loadBalancers.data?.items ?? []) as LoadBalancer[]
  const statusCounts = useMemo(
    () => ({
      all: items.length,
      running: items.filter((item) => item.state === 'available').length,
      error: items.filter((item) => item.state === 'failed').length,
    }),
    [items],
  )
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    return items.filter((item) => {
      if (status === 'running' && item.state !== 'available') return false
      if (status === 'error' && item.state !== 'failed') return false
      if (vpcId && item.vpc_id !== vpcId) return false
      return !keyword || item[searchField].toLowerCase().includes(keyword)
    })
  }, [items, searchField, searchText, status, vpcId])
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => setPage(1), [searchField, searchText, status, vpcId])
  const columns: Array<ListColumn<LoadBalancer>> = [
    {
      key: 'name',
      title: '名称 / ID',
      minWidth: 240,
      render: (item) => (
        <ListNameCell
          name={
            <Link to="/networks/load-balancers/$loadBalancerId" params={{ loadBalancerId: item.id }}>
              {item.name}
            </Link>
          }
          id={item.id}
        />
      ),
    },
    { key: 'state', title: '状态', width: 120, render: (item) => <StatusTag status={item.state} /> },
    { key: 'vip', title: 'VIP', minWidth: 150, render: (item) => item.vip || '—' },
    { key: 'listeners', title: '监听器', width: 110, render: (item) => item.listeners.length },
    { key: 'backends', title: '后端数', width: 110, render: () => '—' },
    { key: 'createdAt', title: '创建时间', minWidth: 190, render: (item) => formatDateTime(item.created_at) },
  ]
  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-fuzaijunhengqi"
            title="负载均衡"
            subtitle="通过 VIP、监听器和后端组对外提供高可用服务"
            extra={
              <ToolbarButton variant="primary" iconClassName="icon-add-1" onClick={() => setCreateVisible(true)}>
                创建负载均衡
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
              { value: 'running', label: '运行中', count: statusCounts.running },
              { value: 'error', label: '异常', count: statusCounts.error },
            ]}
          />
        }
        toolbar={
          <ListToolbar
            filters={
              <div className="flex flex-wrap gap-3">
                <ToolbarSearch
                  fields={[
                    { value: 'name', label: '名称' },
                    { value: 'id', label: 'ID' },
                  ]}
                  field={searchField}
                  value={searchText}
                  onFieldChange={setSearchField}
                  onChange={setSearchText}
                />
                <Select
                  aria-label="按 VPC 筛选"
                  value={vpcId || undefined}
                  onChange={setVpcId}
                  allowClear
                  placeholder="全部 VPC"
                  loading={vpcs.isLoading}
                  style={{ width: 220 }}
                >
                  {((vpcs.data?.items ?? []) as Vpc[]).map((item) => (
                    <Select.Option key={item.id} value={item.id}>
                      {item.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={loadBalancers.isFetching || vpcs.isFetching}
                onClick={() => void Promise.all([loadBalancers.refetch(), vpcs.refetch()])}
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
          loading={loadBalancers.isLoading}
          error={loadBalancers.error ? getErrorMessage(loadBalancers.error, '负载均衡列表加载失败') : null}
          onRetry={() => void loadBalancers.refetch()}
          emptyIconClassName="icon-fuzaijunhengqi"
          emptyText={
            searchText || vpcId || status !== 'all'
              ? '没有符合条件的负载均衡'
              : '还没有负载均衡，点击「创建负载均衡」开始'
          }
          tableLabel="负载均衡列表"
          preserveTableOnEmpty
          renderRowActions={(item) => (
            <ListRowActions>
              <ListRowActionButton
                onClick={() =>
                  navigate({ to: '/networks/load-balancers/$loadBalancerId', params: { loadBalancerId: item.id } })
                }
              >
                详情
              </ListRowActionButton>
              <Dropdown
                droplist={
                  <Menu>
                    <Menu.Item
                      key="listeners"
                      onClick={() =>
                        navigate({
                          to: '/networks/load-balancers/$loadBalancerId',
                          params: { loadBalancerId: item.id },
                        })
                      }
                    >
                      配置监听
                    </Menu.Item>
                    <Menu.Item
                      key="backends"
                      onClick={() =>
                        navigate({
                          to: '/networks/load-balancers/$loadBalancerId',
                          params: { loadBalancerId: item.id },
                        })
                      }
                    >
                      绑定后端
                    </Menu.Item>
                    <Menu.Item
                      key="delete"
                      onClick={() =>
                        Modal.confirm({
                          title: '删除负载均衡',
                          content: `确定删除「${item.name}」？`,
                          okButtonProps: { status: 'danger' },
                          onOk: () => deleteLoadBalancer.mutateAsync(item),
                        })
                      }
                    >
                      删除
                    </Menu.Item>
                  </Menu>
                }
                trigger="click"
              >
                <ListRowActionButton>更多</ListRowActionButton>
              </Dropdown>
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
      <CreateLoadBalancerModal visible={createVisible} onCancel={() => setCreateVisible(false)} />
    </>
  )
}
