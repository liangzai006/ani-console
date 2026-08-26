import { Dropdown, Menu, Message, Popover } from '@arco-design/web-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  DataTable,
  ListPageFrame,
  ListPageHeader,
  ListNameCell,
  ListRowActionButton,
  ListRowActions,
  ListToolbar,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
  type ListSortDirection,
} from '@/components/common'
import { vmInstanceDataSource } from './data-source'
import type {
  VmInstance,
  VmInstanceDataSource,
  VmInstancePowerAction,
  VmInstanceSearchField,
  VmInstanceSortField,
  VmInstanceStatus,
  VmInstanceStatusFilter,
} from './types'
import styles from './vm.module.css'

const STATUS_META: Record<VmInstanceStatus, { label: string }> = {
  running: { label: '运行中' },
  stopped: { label: '已停止' },
  error: { label: '异常' },
}

const ALL_COLUMN_KEYS = ['name', 'status', 'spec', 'image', 'privateIp', 'node', 'protection', 'createdAt'] as const
type ColumnKey = (typeof ALL_COLUMN_KEYS)[number]

const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: '名称 / ID',
  status: '状态',
  spec: '规格',
  image: '镜像',
  privateIp: '私网 IP',
  node: '节点',
  protection: '终止保护',
  createdAt: '创建时间',
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timer)
  }, [delay, value])

  return debouncedValue
}

function ActionMenu({
  row,
  onAction,
}: {
  row?: VmInstance
  onAction: (action: string) => void
}) {
  return (
    <Menu onClickMenuItem={onAction}>
      {row ? (
        <>
          {row.status !== 'stopped' ? <Menu.Item key="restart">重启</Menu.Item> : null}
          {row.status === 'running' ? <Menu.Item key="console">远程连接</Menu.Item> : null}
        </>
      ) : null}
      <Menu.ItemGroup title="配置">
        <Menu.Item key="resize">变配</Menu.Item>
        <Menu.Item key="rebuild">重建</Menu.Item>
      </Menu.ItemGroup>
      <Menu.ItemGroup title="磁盘与快照">
        <Menu.Item key="mount">挂载磁盘</Menu.Item>
        <Menu.Item key="snapshot">创建快照</Menu.Item>
      </Menu.ItemGroup>
      <Menu.Item key="export">导出</Menu.Item>
      <Menu.Item key="delete" style={{ color: '#e35b5b' }}>
        删除
      </Menu.Item>
    </Menu>
  )
}

function StatusCell({ status }: { status: VmInstanceStatus }) {
  return (
    <span className={`${styles.status} ${styles[`status_${status}`]}`}>
      <span className={styles.statusDot} />
      <span>{STATUS_META[status].label}</span>
    </span>
  )
}

function ProtectionCell({ enabled }: { enabled: boolean }) {
  return (
    <span className={`${styles.protection} ${enabled ? styles.protectionOn : styles.protectionOff}`}>
      <span className={styles.protectDot} />
      <span>{enabled ? '开启' : '关闭'}</span>
    </span>
  )
}

export function VmInstancesPage({ dataSource = vmInstanceDataSource }: { dataSource?: VmInstanceDataSource }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<VmInstanceStatusFilter>('all')
  const [searchField, setSearchField] = useState<VmInstanceSearchField>('name')
  const [searchText, setSearchText] = useState('')
  const keyword = useDebouncedValue(searchText, 200)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [sortField, setSortField] = useState<VmInstanceSortField>()
  const [sortDirection, setSortDirection] = useState<ListSortDirection>()
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([...ALL_COLUMN_KEYS])

  useEffect(() => {
    setPage(1)
    setSelectedKeys([])
  }, [keyword, searchField, status])

  const query = useQuery({
    queryKey: ['vm-instances-v2', { status, searchField, keyword, page, pageSize, sortField, sortDirection }],
    queryFn: () =>
      dataSource.list({ status, searchField, keyword, page, pageSize, sortField, sortDirection }),
    placeholderData: (previous) => previous,
  })

  const result = query.data ?? {
    items: [],
    total: 0,
    statusCounts: { all: 0, running: 0, stopped: 0, error: 0 },
  }
  const selectedRows = result.items.filter((item) => selectedKeys.includes(item.id))
  const canStart = selectedRows.some((item) => item.status === 'stopped' || item.status === 'error')
  const canStop = selectedRows.some((item) => item.status === 'running')

  const powerMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: VmInstancePowerAction }) =>
      dataSource.changePowerState(ids, action),
    onSuccess: (_, variables) => {
      Message.success(variables.action === 'start' ? '启动操作已提交' : '停止操作已提交')
      setSelectedKeys([])
      void queryClient.invalidateQueries({ queryKey: ['vm-instances-v2'] })
    },
    onError: () => Message.error('操作失败，请稍后重试'),
  })

  const changePowerState = (rows: VmInstance[], action: VmInstancePowerAction) => {
    const compatibleRows = rows.filter((item) =>
      action === 'start' ? item.status === 'stopped' || item.status === 'error' : item.status === 'running',
    )
    if (compatibleRows.length === 0) return
    powerMutation.mutate({ ids: compatibleRows.map((item) => item.id), action })
  }

  const toggleSort = (field: VmInstanceSortField) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDirection('desc')
    } else {
      setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))
    }
    setPage(1)
    setSelectedKeys([])
  }

  const notifyMenuAction = (action: string, row?: VmInstance) => {
    Message.info(`${row?.name ?? `${selectedKeys.length} 个实例`}：${action}`)
  }

  const allColumns: Array<ListColumn<VmInstance>> = [
      {
        key: 'name',
        title: COLUMN_LABELS.name,
        minWidth: 220,
        render: (row) => (
          <ListNameCell
            name={<Link to="/instances/vm/$instanceId" params={{ instanceId: row.id }}>
              {row.name}
            </Link>}
            id={row.id}
          />
        ),
      },
      {
        key: 'status',
        title: COLUMN_LABELS.status,
        width: 120,
        sortable: true,
        sortDirection: sortField === 'status' ? sortDirection : undefined,
        onSort: () => toggleSort('status'),
        render: (row) => <StatusCell status={row.status} />,
      },
      { key: 'spec', title: COLUMN_LABELS.spec, minWidth: 140, render: (row) => row.spec },
      { key: 'image', title: COLUMN_LABELS.image, minWidth: 200, render: (row) => row.image },
      { key: 'privateIp', title: COLUMN_LABELS.privateIp, minWidth: 140, render: (row) => row.privateIp },
      { key: 'node', title: COLUMN_LABELS.node, minWidth: 140, render: (row) => row.node },
      {
        key: 'protection',
        title: COLUMN_LABELS.protection,
        width: 140,
        render: (row) => <ProtectionCell enabled={row.terminationProtected} />,
      },
      {
        key: 'createdAt',
        title: COLUMN_LABELS.createdAt,
        minWidth: 210,
        sortable: true,
        sortDirection: sortField === 'createdAt' ? sortDirection : undefined,
        onSort: () => toggleSort('createdAt'),
        render: (row) => row.createdAt,
      },
    ]

  const columns = allColumns.filter((column) => visibleColumns.includes(column.key as ColumnKey))
  const statusTabs = [
    { value: 'all' as const, label: '全部', count: result.statusCounts.all },
    { value: 'running' as const, label: '运行中', count: result.statusCounts.running },
    { value: 'stopped' as const, label: '已停止', count: result.statusCounts.stopped },
    { value: 'error' as const, label: '异常', count: result.statusCounts.error },
  ]

  const columnSettings = (
    <div className={styles.columnSettings} aria-label="列设置">
      {ALL_COLUMN_KEYS.map((key) => (
        <label key={key} className={styles.columnSettingItem}>
          <input
            type="checkbox"
            checked={visibleColumns.includes(key)}
            disabled={key === 'name'}
            onChange={() => {
              setVisibleColumns((current) =>
                current.includes(key) ? current.filter((column) => column !== key) : [...current, key],
              )
            }}
          />
          <span>{COLUMN_LABELS[key]}</span>
        </label>
      ))}
    </div>
  )

  return (
    <ListPageFrame
      header={
        <ListPageHeader
          iconClassName="icon-yunzhuji"
          title="云主机 VM"
          subtitle="云主机提供弹性的虚拟计算资源，支持按需创建、灵活变配、远程连接与快照回滚等操作"
          extra={
            <ToolbarButton
              variant="primary"
              iconClassName="icon-add-1"
              onClick={() => navigate({ to: '/instances/vm/create' })}
            >
              创建云主机
            </ToolbarButton>
          }
        />
      }
      tabs={<StatusTabs items={statusTabs} value={status} onChange={setStatus} />}
      toolbar={
        <ListToolbar
          actions={
            <>
              {status !== 'running' ? (
                <ToolbarButton
                  variant="secondary"
                  iconClassName="icon-check-circle"
                  disabled={!canStart || powerMutation.isPending}
                  onClick={() => changePowerState(selectedRows, 'start')}
                >
                  启动
                </ToolbarButton>
              ) : null}
              {status !== 'stopped' && status !== 'error' ? (
                <ToolbarButton
                  variant="secondary"
                  iconClassName="icon-stop-circle"
                  disabled={!canStop || powerMutation.isPending}
                  onClick={() => changePowerState(selectedRows, 'stop')}
                >
                  停止
                </ToolbarButton>
              ) : null}
              <Dropdown
                trigger="click"
                position="bl"
                disabled={selectedRows.length === 0}
                droplist={<ActionMenu onAction={(action) => notifyMenuAction(action)} />}
              >
                <ToolbarButton iconClassName="icon-more-1" disabled={selectedRows.length === 0}>
                  更多
                </ToolbarButton>
              </Dropdown>
            </>
          }
          filters={
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
          }
          tools={
            <>
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={query.isFetching}
                onClick={() => void query.refetch()}
              />
              <Popover trigger="click" position="br" content={columnSettings}>
                <ToolbarIconButton iconClassName="icon-setting" label="列设置" />
              </Popover>
            </>
          }
        />
      }
    >
      <DataTable
        rows={result.items}
        rowKey={(row) => row.id}
        columns={columns}
        selectedKeys={selectedKeys}
        onSelectedKeysChange={setSelectedKeys}
        loading={query.isLoading}
        error={query.error instanceof Error ? query.error.message : query.error ? '数据加载失败' : null}
        onRetry={() => void query.refetch()}
        emptyIconClassName="icon-yunzhuji"
        emptyText={keyword || status !== 'all' ? '没有符合条件的云主机' : '还没有云主机，点击「创建云主机」开始'}
        tableLabel="云主机 VM 列表"
        renderRowActions={(row) => (
          <ListRowActions>
            <ListRowActionButton
              onClick={() => changePowerState([row], row.status === 'running' ? 'stop' : 'start')}
            >
              {row.status === 'running' ? '停止' : '启动'}
            </ListRowActionButton>
            <Dropdown
              trigger="click"
              position="br"
              droplist={<ActionMenu row={row} onAction={(action) => notifyMenuAction(action, row)} />}
            >
              <ListRowActionButton>
                更多
                <i className={`iconfont icon-down-chevron-small ${styles.moreMenuIcon}`} aria-hidden="true" />
              </ListRowActionButton>
            </Dropdown>
          </ListRowActions>
        )}
        pagination={{
          page,
          pageSize,
          total: result.total,
          onPageChange: (nextPage) => {
            setPage(nextPage)
            setSelectedKeys([])
          },
          onPageSizeChange: (nextPageSize) => {
            setPageSize(nextPageSize)
            setPage(1)
            setSelectedKeys([])
          },
        }}
      />
    </ListPageFrame>
  )
}
