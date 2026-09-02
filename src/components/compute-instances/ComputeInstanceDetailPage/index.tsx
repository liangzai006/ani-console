import { DataTable, StatusTag } from '@/components/common'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button, Card, Descriptions, Empty, Message, Modal, Space, Spin, Tabs, Tooltip } from '@arco-design/web-react'
import { useEffect, useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { InstanceLogsPanel } from '@/components/instances/InstanceLogsPanel'
import { useListErrorNotification } from '@/hooks/useListErrorNotification'
import { formatDateTime } from '@/lib/format'
import { newIdempotencyKey } from '@/lib/idempotency'
import { getInstanceDisplayIp, getInstanceNetworkValue } from '@/lib/instance-network'
import { getInstanceActionErrorMessage, getSandboxProviderLabel } from '@/lib/sandbox-instance'

type InstanceOperation = {
  id: string
  operation?: string
  status?: string
  created_at?: string
}

function openTerminalWindow(instanceId: string) {
  const url = `/instance-terminal/${encodeURIComponent(instanceId)}`
  const width = 1200
  const height = 800
  const left = Math.max(0, window.screenX + Math.round((window.outerWidth - width) / 2))
  const top = Math.max(0, window.screenY + Math.round((window.outerHeight - height) / 2))
  window.open(url, `Connecting ${instanceId}`, `width=${width},height=${height},left=${left},top=${top},scrollbars=1,resizable=1`)
}

function openConsoleWindow(instanceId: string) {
  const url = `/instance-console/${encodeURIComponent(instanceId)}`
  const width = 1200
  const height = 800
  const left = Math.max(0, window.screenX + Math.round((window.outerWidth - width) / 2))
  const top = Math.max(0, window.screenY + Math.round((window.outerHeight - height) / 2))
  window.open(url, `Console ${instanceId}`, `width=${width},height=${height},left=${left},top=${top},scrollbars=1,resizable=1`)
}

function TabQueryBody<T>({
  query,
  emptyDescription,
  notificationId,
  errorTitle,
  children,
}: {
  query: UseQueryResult<T>
  emptyDescription: string
  notificationId: string
  errorTitle: string
  children: (data: T) => React.ReactNode
}) {
  useListErrorNotification({ id: notificationId, title: errorTitle, error: query.error })
  if (query.isFetching && !query.data) {
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    )
  }
  if (!query.data) return <Empty description={emptyDescription} />
  return <>{children(query.data)}</>
}

export function InstanceDetailPage({ instanceId }: { instanceId: string }) {
  return <InstanceDetailContent instanceId={instanceId} returnTo="/compute-instances" />
}

export function InstanceDetailContent({ instanceId, returnTo }: { instanceId: string; returnTo: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')

  const detail = useQuery({
    queryKey: ['instance', instanceId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/instances/{instance_id}', {
        params: { path: { instance_id: instanceId } },
      })
      if (error) throw error
      return data
    },
  })
  useListErrorNotification({
    id: `instance-detail:${instanceId}`,
    title: '实例详情加载失败',
    error: detail.error,
  })

  const events = useQuery({
    queryKey: ['instance', instanceId, 'events'],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/instances/{instance_id}/events', {
        params: { path: { instance_id: instanceId }, query: { limit: 50 } },
      })
      if (error) throw error
      return data
    },
    enabled: false,
  })

  const metrics = useQuery({
    queryKey: ['instance', instanceId, 'metrics'],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/instances/{instance_id}/metrics', {
        params: { path: { instance_id: instanceId } },
      })
      if (error) throw error
      return data
    },
    enabled: false,
  })

  const security = useQuery({
    queryKey: ['instance', instanceId, 'security'],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/instances/{instance_id}/security-events', {
        params: { path: { instance_id: instanceId }, query: { limit: 50 } },
      })
      if (error) throw error
      return data
    },
    enabled: false,
  })

  const operations = useQuery({
    queryKey: ['instance', instanceId, 'operations'],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/instances/{instance_id}/operations', {
        params: { path: { instance_id: instanceId }, query: { limit: 50 } },
      })
      if (error) throw error
      return data
    },
    enabled: false,
  })

  useEffect(() => {
    if (detail.data?.kind !== 'gpu_container') return
    navigate({
      to: '/gpu-instances/$instanceId',
      params: { instanceId },
      replace: true,
    })
  }, [detail.data?.kind, instanceId, navigate])

  const lifecycle = useMutation({
    mutationFn: async (action: 'start' | 'stop' | 'restart' | 'delete') => {
      const { error, response } = await coreApi.POST('/instances/{instance_id}/lifecycle', {
        params: { path: { instance_id: instanceId } },
        body: { action, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw { ...(typeof error === 'object' && error ? error : { message: String(error) }), status: response.status }
      return action
    },
    onSuccess: (action) => {
      if (action === 'delete') {
        Message.success('实例已删除')
        qc.invalidateQueries({ queryKey: ['instances'] })
        navigate({ to: returnTo })
        return
      }
      qc.invalidateQueries({ queryKey: ['instance', instanceId] })
    },
    onError: (e) => Message.error(getInstanceActionErrorMessage(e, 'lifecycle')),
  })

  const confirmDelete = () => {
    Modal.confirm({
      title: '删除实例',
      content: '删除后实例资源将不可恢复，确认继续？',
      okButtonProps: { status: 'danger' },
      onOk: () => lifecycle.mutateAsync('delete'),
    })
  }

  if (detail.isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="实例详情" subtitle="加载中…" />
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      </div>
    )
  }

  if (!detail.data)
    return (
      <div className="space-y-5">
        <PageHeader title={instanceId} subtitle="实例详情" />
        <Empty description="暂无实例详情数据" />
      </div>
    )

  if (detail.data?.kind === 'gpu_container') {
    return (
      <div className="flex justify-center py-16">
        <Spin />
      </div>
    )
  }

  const inst = detail.data
  const isVmInstance = inst?.kind === 'vm'
  const isRunning = inst?.state === 'running'
  const canStart = !isRunning
  const canStop = isRunning
  const canOpenConsole = isVmInstance && inst?.state === 'running'
  const isSandboxInstance = inst?.kind === 'sandbox'
  const sandbox = inst?.sandbox

  return (
    <div className="space-y-5">
      <PageHeader
        title={inst?.name ?? instanceId}
        subtitle={`实例详情 · ${inst?.kind ?? ``}`}
        extra={
          <Space wrap>
            {isVmInstance ? (
              <Button
                type="primary"
                disabled={!canOpenConsole}
                title={canOpenConsole ? undefined : '实例未运行'}
                onClick={() => openConsoleWindow(instanceId)}
              >
                控制台
              </Button>
            ) : null}
            <Button type="outline" onClick={() => openTerminalWindow(instanceId)}>
              终端
            </Button>
            <Button type="outline" disabled={!canStart} title={canStart ? undefined : "实例正在运行"} onClick={() => lifecycle.mutateAsync("start")}>
              启动
            </Button>
            <Button type="outline" disabled={!canStop} title={canStop ? undefined : "实例未运行"} onClick={() => lifecycle.mutateAsync("stop")}>
              停止
            </Button>
            {isVmInstance ? (
              <Button
                type="outline"
                disabled={!isRunning}
                title={isRunning ? undefined : '实例未运行'}
                onClick={() => lifecycle.mutateAsync('restart')}
              >
                重启
              </Button>
            ) : null}
            <Button type="outline" status="danger" onClick={confirmDelete}>
              删除
            </Button>
            <Button type="text" onClick={() => navigate({ to: returnTo })}>
              返回列表
            </Button>
          </Space>
        }
      />
      <Card>
        <Descriptions
          column={{ xs: 1, sm: 2, md: 3 }}
          data={[
            { label: 'ID', value: inst?.id },
            { label: '类型', value: inst?.kind },
            {
              label: '状态',
              value: inst?.reason ? (
                <Tooltip content={inst.reason}>
                  <span className="inline-flex">
                    <StatusTag status={inst.state} />
                  </span>
                </Tooltip>
              ) : (
                <StatusTag status={inst?.state} />
              ),
            },
            { label: '创建', value: formatDateTime(inst?.created_at) },
            { label: '更新', value: formatDateTime(inst?.updated_at) },
          ]}
        />
      </Card>
      <Tabs
        activeTab={activeTab}
        onChange={(key) => {
          setActiveTab(key)
          if (key === 'events') events.refetch()
          if (key === 'metrics') metrics.refetch()
          if (key === 'security') security.refetch()
          if (key === 'ops') operations.refetch()
        }}
      >
        <Tabs.TabPane key="overview" title="概览">
          <div className="space-y-4">
            <Descriptions
              column={1}
              data={[
                { label: '节点', value: inst?.node_name ?? '-' },
                { label: 'VPC', value: getInstanceNetworkValue(inst, 'vpc_id') },
                { label: '子网', value: getInstanceNetworkValue(inst, 'subnet_id') },
                { label: '内网 IP', value: getInstanceDisplayIp(inst) },
                { label: '终止保护', value: inst?.termination_protection ? '已开启' : '未开启' },
                { label: '状态说明', value: inst?.reason ?? '-' },
              ]}
            />
            {isSandboxInstance ? (
              <Descriptions
                title="Sandbox"
                column={1}
                data={[
                  { label: 'Runtime Class', value: sandbox?.runtime_class ?? '-' },
                  { label: 'Session State', value: sandbox?.session_state ?? '-' },
                  { label: 'Session Timeout', value: sandbox?.session_timeout ?? '-' },
                  { label: 'Egress Policy', value: sandbox?.network_egress_policy ?? '-' },
                  { label: 'Provider 状态', value: getSandboxProviderLabel(inst ?? {}) },
                  { label: 'Provider', value: inst?.provider ?? '-' },
                  { label: 'Dev Profile Mode', value: inst?.dev_profile?.mode ?? sandbox?.dev_profile?.mode ?? '-' },
                  { label: 'Dev Profile Provider', value: inst?.dev_profile?.provider ?? sandbox?.dev_profile?.provider ?? '-' },
                  { label: 'Real Provider', value: String(inst?.dev_profile?.real_provider ?? sandbox?.dev_profile?.real_provider ?? false) },
                  { label: 'Resource refs', value: inst?.resource_refs?.length ? inst.resource_refs.join('，') : '-' },
                ]}
              />
            ) : null}
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane key="logs" title="日志">
          <InstanceLogsPanel instanceId={instanceId} active={activeTab === 'logs'} />
        </Tabs.TabPane>
        <Tabs.TabPane key="events" title="事件">
          <TabQueryBody
            query={events}
            emptyDescription="暂无事件"
            notificationId={`instance-events:${instanceId}`}
            errorTitle="事件加载失败"
          >
            {(data) => {
              const items = (data as { items?: Record<string, unknown>[] })?.items ?? []
              return items.length === 0 ? (
                <Empty description="暂无事件" />
              ) : (
                <DataTable
                  data={items}
                  columns={Object.keys(items[0] ?? {}).map((key) => ({
                    key,
                    title: key,
                    dataIndex: key,
                  }))}
                  pagination={false}
                />
              )
            }}
          </TabQueryBody>
        </Tabs.TabPane>
        <Tabs.TabPane key="metrics" title="指标">
          <TabQueryBody
            query={metrics}
            emptyDescription="暂无指标"
            notificationId={`instance-metrics:${instanceId}`}
            errorTitle="指标加载失败"
          >
            {(data) => (
              <pre className="overflow-auto rounded bg-[var(--color-fill-2)] p-3 text-xs">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </TabQueryBody>
        </Tabs.TabPane>
        <Tabs.TabPane key="security" title="安全事件">
          <TabQueryBody
            query={security}
            emptyDescription="暂无安全事件"
            notificationId={`instance-security-events:${instanceId}`}
            errorTitle="安全事件加载失败"
          >
            {(data) => {
              const items = (data as { items?: Record<string, unknown>[] })?.items ?? []
              return items.length === 0 ? (
                <Empty description="暂无安全事件" />
              ) : (
                <DataTable
                  data={items}
                  columns={Object.keys(items[0] ?? {}).map((key) => ({
                    key,
                    title: key,
                    dataIndex: key,
                  }))}
                  pagination={false}
                />
              )
            }}
          </TabQueryBody>
        </Tabs.TabPane>
        <Tabs.TabPane key="ops" title="操作历史">
          <TabQueryBody
            query={operations}
            emptyDescription="暂无操作历史"
            notificationId={`instance-operations:${instanceId}`}
            errorTitle="操作历史加载失败"
          >
            {(data) => {
              const items = (data as { items?: InstanceOperation[] })?.items ?? []
              return items.length === 0 ? (
                <Empty description="暂无操作历史" />
              ) : (
                <DataTable<InstanceOperation>
                  data={items}
                  columns={[
                    { title: '操作', dataIndex: 'operation' },
                    {
                      title: '状态',
                      width: 120,
                      render: (_, operation) => <StatusTag status={operation.status} />,
                    },
                    {
                      title: '时间',
                      render: (_, operation) => formatDateTime(operation.created_at),
                    },
                  ]}
                  pagination={false}
                />
              )
            }}
          </TabQueryBody>
        </Tabs.TabPane>
      </Tabs>
    </div>
  )
}
