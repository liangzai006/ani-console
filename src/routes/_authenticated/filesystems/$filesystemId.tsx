import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Card, Empty, Modal, Space, Spin, Table, Typography } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { DetailPageFrame } from '@/components/detailbase'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'
import { AliIcon } from '@/components/icons/AliIcon'
import { StatusTag } from '@/components/shell/StatusTag'
import { listOrThrow } from '@/lib/api-list'
import { formatDateTime } from '@/lib/format'

type Filesystem = components['schemas']['StorageFilesystem']
type MountTarget = components['schemas']['FilesystemMountTarget']

export const Route = createFileRoute('/_authenticated/filesystems/$filesystemId')({ component: FilesystemDetailPage })

function FilesystemDetailPage() {
  const { filesystemId } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: ['filesystem', filesystemId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/filesystems/{filesystem_id}', { params: { path: { filesystem_id: filesystemId } } })
      if (error) throw error
      return data
    },
  })
  const mounts = useQuery({
    queryKey: ['filesystem-mounts', filesystemId],
    queryFn: () => listOrThrow(() => coreApi.GET('/filesystems/{filesystem_id}/mount-targets', { params: { path: { filesystem_id: filesystemId }, query: { limit: 100 } } })),
  })
  const remove = useMutation({
    mutationFn: async (_: undefined) => {
      const { error } = await coreApi.DELETE('/filesystems/{filesystem_id}', { params: { path: { filesystem_id: filesystemId } } })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['filesystems'] }); navigate({ to: '/filesystems' }) },
    onError: (error) => showApiError(error),
  })
  if (detail.isLoading && !detail.data) return <div className="flex justify-center py-20"><Spin /></div>
  if (detail.error || !detail.data) return <ApiErrorAlert error={detail.error ?? new Error('文件存储不存在或无权访问')} title="文件存储加载失败" />

  const filesystem = detail.data as Filesystem
  const mountItems = (mounts.data?.items ?? []) as MountTarget[]
  const primaryTarget = mountItems.find((item) => item.status === 'available') ?? mountItems[0]
  const endpoint = filesystem.endpoint ?? primaryTarget?.ip_address
  const mountCommand = endpoint ? `sudo mkdir -p /mnt/${filesystem.name}\nsudo mount -t ${filesystem.protocol} ${endpoint}:/ /mnt/${filesystem.name}` : null
  const unavailable = (description: string) => <Empty description={description} />

  return <DetailPageFrame
    breadcrumbs={[{ label: '存储' }, { label: '文件存储', to: '/filesystems' }, { label: filesystem.name }]}
    title={filesystem.name} status={<StatusTag status={filesystem.state} />} icon={<AliIcon name="wenjiancunchu" size={28} />}
    headerItems={[{ label: '文件系统 ID', value: filesystem.id }, { label: '容量 (GiB)', value: filesystem.size_gib }, { label: '创建时间', value: formatDateTime(filesystem.created_at) }]}
    actions={<Button status="danger" loading={remove.isPending} onClick={() => Modal.confirm({ title: '删除文件存储', content: `确定删除「${filesystem.name}」？请先卸载所有客户端并确认没有业务正在访问。`, okButtonProps: { status: 'danger' }, onOk: () => remove.mutateAsync(undefined) })}>删除</Button>}
    cards={[
      { key: 'basic', title: '基本信息', fields: [
        { label: 'ID', value: filesystem.id }, { label: '名称', value: filesystem.name }, { label: '状态', value: <StatusTag status={filesystem.state} /> },
        { label: '协议', value: filesystem.protocol.toUpperCase() }, { label: '容量 (GiB)', value: filesystem.size_gib }, { label: '挂载端点', value: filesystem.endpoint ?? '—' },
        { label: '状态原因', value: filesystem.reason || '—' }, { label: '创建时间', value: formatDateTime(filesystem.created_at) }, { label: '更新时间', value: formatDateTime(filesystem.updated_at) },
      ] },
      { key: 'related-summary', title: '关联摘要', fields: mountItems.length ? [{ label: '挂载目标', value: `${mountItems.length} 个` }, { label: '可用挂载目标', value: `${mountItems.filter((item) => item.status === 'available').length} 个` }] : [{ label: '暂无挂载目标', value: '—' }] },
    ]}
    tabs={[
      { key: 'mount-targets', label: '挂载目标', content: mounts.error ? <ApiErrorAlert error={mounts.error} /> : <Table<MountTarget>
        columns={[{ title: 'ID', dataIndex: 'id' }, { title: '状态', render: (_, row) => <StatusTag status={row.status} /> }, { title: 'IP 地址', dataIndex: 'ip_address' }, { title: '子网', render: (_, row) => <Link to="/networks/subnets/$subnetId" params={{ subnetId: row.subnet_id }}>{row.subnet_id}</Link> }, { title: '创建时间', render: (_, row) => formatDateTime(row.created_at) }]}
        data={mountItems} loading={mounts.isLoading} rowKey="id" pagination={false} noDataElement={<Empty description="暂无挂载目标；当前 Core API 暂未提供创建挂载目标能力" />} /> },
      { key: 'mount-guide', label: '挂载指南', content: <Space direction="vertical" size={16} className="w-full">
        <Alert type="info" showIcon content="请确保客户端与挂载目标网络互通，并已放通文件存储协议所需端口。" />
        <Card title="Linux 挂载命令" size="small">{mountCommand ? <><pre className="m-0 overflow-auto rounded p-4" style={{ background: 'var(--color-fill-2)', color: 'var(--color-text-1)' }}>{mountCommand}</pre><Button className="mt-3" onClick={() => void navigator.clipboard.writeText(mountCommand)}>复制命令</Button></> : <Empty description="暂无可用挂载端点，无法生成挂载命令" />}</Card>
        <Typography.Text type="secondary">SMB / CIFS 当前不在 ANI Core 文件存储契约范围内。</Typography.Text>
      </Space> },
      { key: 'monitoring', label: '监控', content: unavailable('当前 Core API 暂未提供文件存储监控指标') },
      { key: 'events', label: '事件', content: <Space direction="vertical" size={12} className="w-full">{filesystem.reason ? <Alert type="warning" showIcon content={filesystem.reason} /> : null}{unavailable('当前 Core API 暂未提供文件存储事件列表')}</Space> },
    ]}
    onBack={() => navigate({ to: '/filesystems' })}
  />
}
