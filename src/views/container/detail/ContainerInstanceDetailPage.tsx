import { Button, Message, Modal, Space, Tooltip } from '@arco-design/web-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  AliIcon,
  DetailPageFrame,
  StatusTag,
} from '@/components/common'
import { InstanceLogsPanel } from '@/components/instances/InstanceLogsPanel'
import { useListErrorNotification } from '@/hooks/useListErrorNotification'
import { formatDateTime } from '@/lib/format'
import { getInstanceDisplayIp, getInstanceNetworkValue } from '@/lib/instance-network'
import { getInstanceActionErrorMessage } from '@/lib/sandbox-instance'
import { containerDetailDataSource } from './data-source'

function openTerminalWindow(instanceId: string) {
  const url = `/instances/terminal/${encodeURIComponent(instanceId)}`
  const width = 1200
  const height = 800
  const left = Math.max(0, window.screenX + Math.round((window.outerWidth - width) / 2))
  const top = Math.max(0, window.screenY + Math.round((window.outerHeight - height) / 2))
  window.open(url, `Connecting ${instanceId}`, `width=${width},height=${height},left=${left},top=${top},scrollbars=1,resizable=1`)
}

export function ContainerInstanceDetailPage({ instanceId }: { instanceId: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['container-instance-detail', instanceId],
    queryFn: () => containerDetailDataSource.getDetail(instanceId),
  })
  useListErrorNotification({
    id: `container-instance-detail:${instanceId}`,
    title: '容器实例详情加载失败',
    error: query.error,
  })

  const lifecycle = useMutation({
    mutationFn: async (action: 'start' | 'stop' | 'restart') => {
      await containerDetailDataSource.changePowerState(instanceId, action)
      return action
    },
    onSuccess: async (_, action) => {
      const messages: Record<string, string> = { start: '启动操作已提交', stop: '停止操作已提交', restart: '重启操作已提交' }
      Message.success(messages[action] ?? '操作已提交')
      await qc.invalidateQueries({ queryKey: ['container-instance-detail', instanceId] })
      await qc.invalidateQueries({ queryKey: ['container-instances'] })
    },
    onError: (e) => Message.error(getInstanceActionErrorMessage(e, 'lifecycle')),
  })

  const deleteInstance = useMutation({
    mutationFn: async () => {
      await containerDetailDataSource.changePowerState(instanceId, 'delete')
    },
    onSuccess: async () => {
      Message.success('实例已删除')
      await qc.invalidateQueries({ queryKey: ['container-instances'] })
      navigate({ to: '/instances/container' })
    },
    onError: (e) => Message.error(getInstanceActionErrorMessage(e, 'lifecycle')),
  })

  if (query.isLoading) {
    return <div>正在加载容器实例详情...</div>
  }

  if (!query.data)
    return (
      <DetailPageFrame
        breadcrumbs={[{ label: '容器实例', to: '/instances/container' }, { label: instanceId }]}
        title={instanceId}
        icon={<AliIcon name="rongqishili" size={28} />}
        headerItems={[
          { label: '实例 ID', value: instanceId },
          { label: '状态', value: '—' },
          { label: '创建时间', value: '—' },
        ]}
        cards={[{ key: 'basic', title: '基本信息', fields: [{ label: '实例 ID', value: instanceId }] }]}
      />
    )

  const detail = query.data

  const isRunning = detail.state === 'running'
  const canStart = !isRunning
  const canStop = isRunning
  const canRestart = isRunning

  const nameValue = detail.container?.image
    ? `${detail.container.image}${detail.container.cpu || detail.container.memory ? ` / ${[detail.container.cpu, detail.container.memory].filter(Boolean).join(' / ')}` : ''}`
    : '—'

  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: '容器实例', to: '/instances/container' },
        { label: detail.name },
      ]}
      icon={<AliIcon name="icon-rongqishili" size={28} />}
      title={detail.name}
      status={
        detail.reason ? (
          <Tooltip content={detail.reason}>
            <span className="inline-flex">
              <StatusTag status={detail.state} />
            </span>
          </Tooltip>
        ) : (
          <StatusTag status={detail.state} />
        )
      }
      headerItems={[
        { label: '镜像', value: detail.container?.image ?? '—' },
        { label: '规格', value: nameValue },
        { label: '私网 IP', value: getInstanceDisplayIp(detail) || '—' },
      ]}
      actions={
        <Space>
          {canStart ? (
            <Button
              type="primary"
              loading={lifecycle.isPending}
              onClick={() => lifecycle.mutateAsync('start')}
            >
              启动
            </Button>
          ) : null}
          {(canStop || canRestart) ? (
            <Button
              type="outline"
              loading={lifecycle.isPending}
              onClick={() => lifecycle.mutateAsync('restart')}
            >
              重启
            </Button>
          ) : null}
          {canStop ? (
            <Button
              type="outline"
              status="danger"
              loading={lifecycle.isPending}
              onClick={() => lifecycle.mutateAsync('stop')}
            >
              停止
            </Button>
          ) : null}
          <Button
            type="outline"
            onClick={() => openTerminalWindow(instanceId)}
          >
            终端
          </Button>
          <Button
            type="outline"
            status="danger"
            loading={deleteInstance.isPending}
            onClick={() => {
              Modal.confirm({
                title: '删除实例',
                content: '删除后实例资源将不可恢复，确认继续？',
                okButtonProps: { status: 'danger' },
                onOk: () => deleteInstance.mutateAsync(),
              })
            }}
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
            { label: '实例 ID', value: detail.id },
            { label: 'Provider', value: detail.provider },
            { label: '节点', value: detail.node_name ?? '—' },
            { label: '状态说明', value: detail.reason ?? '—' },
            { label: '创建时间', value: formatDateTime(detail.created_at) },
            { label: '更新时间', value: formatDateTime(detail.updated_at) },
            {
              label: '终止保护',
              value: detail.termination_protection ? '已开启' : '未开启',
            },
          ],
        },
        {
          key: 'resource',
          title: '资源状态',
          defaultCollapsed: true,
          fields: [
            { label: '副本', value: detail.container?.replicas != null ? `${detail.container.ready_replicas ?? 0}/${detail.container.replicas}` : '—' },
            { label: '发布状态', value: detail.container?.rollout_status ?? '—' },
            { label: '访问地址', value: detail.endpoint ?? '—' },
            { label: 'VPC', value: getInstanceNetworkValue(detail, 'vpc_id') },
            { label: '子网', value: getInstanceNetworkValue(detail, 'subnet_id') },
          ],
        },
      ]}
      tabs={[
        {
          key: 'logs',
          label: '日志',
          content: <InstanceLogsPanel instanceId={instanceId} active={true} />,
        },
      ]}
      defaultTabKey="logs"
      onBack={() => navigate({ to: '/instances/container' })}
    />
  )
}
