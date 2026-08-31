import { Button, Message, Progress, Space } from '@arco-design/web-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  AliIcon,
  DetailPageFrame,
  StatusTag,
} from '@/components/common'
import { formatDateTime } from '@/lib/format'
import { vmDetailDataSource } from './data-source'
import { VmMonitorTab } from './VmMonitorTab'
import { VmVolumesTab } from './VmVolumesTab'
import { useListErrorNotification } from '@/hooks/useListErrorNotification'
import styles from './detail.module.css'

type VmInstanceDetailPageProps = {
  instanceId: string
}

export function VmInstanceDetailPage({ instanceId }: VmInstanceDetailPageProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['vm-instance-detail', instanceId],
    queryFn: () => vmDetailDataSource.getDetail(instanceId),
  })
  useListErrorNotification({
    id: `vm-instance-detail:${instanceId}`,
    title: 'VM 详情加载失败',
    error: query.error,
  })

  const power = useMutation({
    mutationFn: (action: 'start' | 'stop' | 'restart') => vmDetailDataSource.changePowerState(instanceId, action),
    onSuccess: async (_, action) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['vm-instance-detail', instanceId] }),
        qc.invalidateQueries({ queryKey: ['vm-instance-monitor', instanceId] }),
        qc.invalidateQueries({ queryKey: ['vm-instance-volumes', instanceId] }),
        qc.invalidateQueries({ queryKey: ['vm-instances-v2'] }),
      ])
      Message.success(action === 'start' ? '启动操作已提交' : action === 'stop' ? '停止操作已提交' : '重启操作已提交')
    },
    onError: () => Message.error('操作失败，请稍后重试'),
  })

  if (query.isLoading && !query.data) {
    return (
      <div className={styles.state}>
        <span className={styles.loadingSpinner} />
        <span>正在加载 VM 详情...</span>
      </div>
    )
  }

  if (!query.data)
    return (
      <DetailPageFrame
        breadcrumbs={[{ label: '云主机 VM', to: '/instances/vm' }, { label: instanceId }]}
        title={instanceId}
        icon={<AliIcon name="yunzhuji" size={28} />}
        headerItems={[
          { label: '实例 ID', value: instanceId },
          { label: '状态', value: '—' },
          { label: '创建时间', value: '—' },
        ]}
        cards={[{ key: 'basic', title: '基本信息', fields: [{ label: '实例 ID', value: instanceId }] }]}
      />
    )

  const detail = query.data
  const canStart = detail.status !== 'running'
  const canStop = detail.status === 'running'
  const canConsole = detail.status === 'running'

  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: '云主机 VM', to: '/instances/vm' },
        { label: detail.name },
      ]}
      icon={<AliIcon name="yunzhuji" size={28} />}
      title={detail.name}
      status={<StatusTag status={detail.status} />}
      headerItems={[
        { label: '规格', value: detail.spec },
        { label: '镜像', value: detail.image },
        { label: '私网 IP', value: detail.privateIp },
      ]}
      actions={
        <Space>
          {canStart ? (
            <Button type="primary" loading={power.isPending} onClick={() => power.mutate('start')}>
              启动
            </Button>
          ) : null}
          {canStop ? (
            <Button type="outline" status="danger" loading={power.isPending} onClick={() => power.mutate('stop')}>
              停止
            </Button>
          ) : null}
          <Button type="outline" disabled={!canConsole} onClick={() => Message.info('控制台入口已预留')}>
            控制台
          </Button>
          <Button type="outline" loading={power.isPending} onClick={() => power.mutate('restart')}>
            重启
          </Button>
        </Space>
      }
      cards={[
        {
          key: 'basic',
          title: '基本信息',
          fields: [
            { label: '实例 ID', value: detail.id },
            { label: '区域 / 集群', value: `${detail.zone} / ${detail.cluster}` },
            { label: '系统镜像', value: detail.os },
            { label: '公网 IP', value: detail.publicIp },
            { label: '创建时间', value: formatDateTime(detail.createdAt) },
            { label: '最后心跳', value: formatDateTime(detail.lastHeartbeat) },
          ],
        },
        {
          key: 'resource',
          title: '资源状态',
          defaultCollapsed: true,
          fields: [
            {
              label: 'CPU 使用率',
              value: <Progress percent={detail.cpuUsage} strokeWidth={8} />,
            },
            {
              label: '内存使用率',
              value: <Progress percent={detail.memoryUsage} strokeWidth={8} />,
            },
            {
              label: '磁盘使用率',
              value: <Progress percent={detail.diskUsage} strokeWidth={8} />,
            },
            { label: '运行时长', value: detail.uptime },
          ],
        },
      ]}
      tabs={[
        {
          key: 'monitor',
          label: '监控',
          content: <VmMonitorTab instanceId={instanceId} />,
        },
        {
          key: 'volumes',
          label: '云盘',
          content: <VmVolumesTab instanceId={instanceId} />,
        },
      ]}
      defaultTabKey="monitor"
      onBack={() => navigate({ to: '/instances/vm' })}
    />
  )
}
