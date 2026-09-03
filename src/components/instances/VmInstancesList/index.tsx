import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { coreApi } from '@/api/client'
import type { components } from '@/api/core-schema'
import { asUncontractedQuery } from '@/api/uncontracted-query'
import {
  AsyncTaskPoller,
  DataTableNameCell,
  ListDataTable,
  ListPageFrame,
  ListPageHeader,
  ListToolbar,
  StatusTabs,
  StatusTag,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from '@/components/common'
import { useCursorPaginatedQuery } from '@/hooks/useCursorPaginatedQuery'
import { useListErrorNotification } from '@/hooks/useListErrorNotification'
import { formatDateTime } from '@/lib/format'
import { getInstanceDisplayIp } from '@/lib/instance-network'
import { VmInstanceCreateModal } from '../VmInstanceCreateModal'

type VmInstance = components['schemas']['InstanceRecord']
type StatusFilter = 'all' | 'running' | 'stopped' | 'deploying' | 'failed'

function imageLabel(instance: VmInstance) {
  return instance.image?.name ?? instance.image?.ref ?? '-'
}

function specLabel(instance: VmInstance) {
  const cpu = instance.compute?.cpu
  const memory = instance.compute?.memory
  return cpu || memory ? `${cpu ?? '-'} CPU / ${memory ?? '-'}` : '-'
}

export function VmInstancesList() {
  const [createVisible, setCreateVisible] = useState(false)
  const [operationId, setOperationId] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [searchField, setSearchField] = useState<'name' | 'id'>('name')
  const [searchText, setSearchText] = useState('')
  const { query, page, pageSize, setPage, setPageSize, refresh } = useCursorPaginatedQuery<VmInstance>({
    queryKey: ['vm-instances', { status, searchField, searchText }],
    cursorScope: `vm:${status}:${searchField}:${searchText.trim()}`,
    fetchPage: async ({ cursor, limit }) => {
      const keyword = searchText.trim()
      const { data, error } = await coreApi.GET('/instances', {
        params: { query: asUncontractedQuery({
          kind: 'vm', limit, cursor,
          status: status === 'all' ? undefined : status,
          search_field: keyword ? searchField : undefined,
          keyword: keyword || undefined,
        }) },
      })
      if (error || !data) throw error ?? new Error('云主机列表未返回结果')
      return data
    },
  })
  useListErrorNotification({ id: 'vm-instances:list', title: '云主机列表加载失败', error: query.error })
  useEffect(() => { setPage(1) }, [searchField, searchText, setPage, status])

  const items = query.data?.items ?? []
  const statusTabs = [
    { value: 'all' as const, label: '全部', count: items.length },
    { value: 'running' as const, label: '运行中', count: items.filter((item) => item.state === 'running').length },
    { value: 'stopped' as const, label: '已停止', count: items.filter((item) => item.state === 'stopped').length },
    { value: 'deploying' as const, label: '部署中', count: items.filter((item) => ['pending', 'provisioning', 'starting'].includes(item.state)).length },
    { value: 'failed' as const, label: '异常', count: items.filter((item) => item.state === 'failed').length },
  ]
  const columns: Array<ListColumn<VmInstance>> = [
    { key: 'name', title: '名称 / ID', render: (_, row) => <DataTableNameCell name={<Link to="/vm-instances/$instanceId" params={{ instanceId: row.id }}>{row.name}</Link>} id={row.id} /> },
    { key: 'state', title: '状态', width: 120, render: (_, row) => <StatusTag status={row.state} /> },
    { key: 'spec', title: '规格', render: (_, row) => specLabel(row) },
    { key: 'image', title: '镜像', render: (_, row) => imageLabel(row) },
    { key: 'ip', title: '私网 IP', render: (_, row) => getInstanceDisplayIp(row) },
    { key: 'node', title: '节点', render: (_, row) => row.compute?.node_name ?? row.node_name ?? '-' },
    { key: 'protection', title: '终止保护', render: (_, row) => row.termination_protection ? '开启' : '关闭' },
    { key: 'createdAt', title: '创建时间', render: (_, row) => formatDateTime(row.created_at) },
  ]

  return <>
    <ListPageFrame
      header={<ListPageHeader iconClassName="icon-yunzhuji" title="云主机 VM" subtitle="弹性虚拟计算资源，支持生命周期管理、VNC 控制台与运行状态观测" extra={<ToolbarButton variant="primary" iconClassName="icon-add-1" onClick={() => setCreateVisible(true)}>创建云主机</ToolbarButton>} />}
      tabs={<StatusTabs items={statusTabs} value={status} onChange={setStatus} />}
      toolbar={<ListToolbar filters={<ToolbarSearch fields={[{ value: 'name', label: '名称' }, { value: 'id', label: 'ID' }]} field={searchField} value={searchText} onFieldChange={setSearchField} onChange={setSearchText} />} tools={<ToolbarIconButton iconClassName="icon-refresh-1" label="刷新" spinning={query.isFetching} onClick={refresh} />} />}
    >
      {operationId ? <AsyncTaskPoller taskId={operationId} onComplete={() => { setOperationId(null); refresh() }} /> : null}
      <ListDataTable data={items} columns={columns} loading={query.isFetching} emptyIconClassName="icon-yunzhuji" emptyText="还没有云主机，点击「创建云主机」开始" tableLabel="云主机 VM 列表" pagination={{ page, pageSize, total: query.data?.total ?? items.length, onPageChange: setPage, onPageSizeChange: setPageSize }} />
    </ListPageFrame>
    <VmInstanceCreateModal visible={createVisible} onCancel={() => setCreateVisible(false)} onCreated={(id) => { setCreateVisible(false); setOperationId(id ?? null); refresh() }} />
  </>
}
