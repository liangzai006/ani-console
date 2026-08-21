import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Card, Empty, List, Modal, Space, Spin, Table, Tag, Typography } from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { DetailPageFrame } from '@/components/detailbase'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'
import { AliIcon } from '@/components/icons/AliIcon'
import { StatusTag } from '@/components/shell/StatusTag'
import { AttachVolumeModal } from '@/components/storage/AttachVolumeModal'
import { CreateVolumeSnapshotModal } from '@/components/storage/CreateVolumeSnapshotModal'
import { listOrThrow } from '@/lib/api-list'
import { formatBytes, formatDateTime } from '@/lib/format'
import { newIdempotencyKey } from '@/lib/idempotency'

type Volume = components['schemas']['StorageVolume']
type VolumeSnapshot = components['schemas']['VolumeSnapshotRecord']

export const Route = createFileRoute('/_authenticated/volumes/$volumeId')({ component: VolumeDetailPage })

function VolumeDetailPage() {
  const { volumeId } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [snapshotVisible, setSnapshotVisible] = useState(false)
  const [attachVisible, setAttachVisible] = useState(false)
  const detail = useQuery({
    queryKey: ['volume', volumeId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/volumes/{volume_id}', { params: { path: { volume_id: volumeId } } })
      if (error) throw error
      return data
    },
  })
  const snapshots = useQuery({
    queryKey: ['volume-snapshots', volumeId],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET('/volumes/{volume_id}/snapshots', {
          params: { path: { volume_id: volumeId }, query: { limit: 100 } },
        }),
      ),
  })
  const deleteVolume = useMutation({
    mutationFn: async (_: undefined) => {
      const { error } = await coreApi.DELETE('/volumes/{volume_id}', { params: { path: { volume_id: volumeId } } })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volumes'] })
      navigate({ to: '/volumes' })
    },
    onError: (error) => showApiError(error),
  })
  const detachVolume = useMutation({
    mutationFn: async (instanceId: string) => {
      const { error } = await coreApi.POST('/instances/{instance_id}/lifecycle', {
        params: { path: { instance_id: instanceId } },
        body: { action: 'detach_volume', volume_id: volumeId, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instances'] })
      qc.invalidateQueries({ queryKey: ['volume', volumeId] })
      qc.invalidateQueries({ queryKey: ['volumes'] })
    },
    onError: (error) => showApiError(error),
  })

  if (detail.isLoading && !detail.data)
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    )
  if (detail.error || !detail.data)
    return <ApiErrorAlert error={detail.error ?? new Error('块存储卷不存在或无权访问')} title="块存储卷加载失败" />

  const volume = detail.data as Volume
  const snapshotItems = (snapshots.data?.items ?? []) as VolumeSnapshot[]
  const mounted = Boolean(volume.mount_instance_id)
  const openMountedInstance = () => {
    if (!volume.mount_instance_id) return
    navigate({ to: '/instances/$instanceId', params: { instanceId: volume.mount_instance_id } })
  }
  const unavailable = (description: string) => <Empty description={description} />

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[{ label: '存储' }, { label: '块存储', to: '/volumes' }, { label: volume.name }]}
        title={volume.name}
        status={<StatusTag status={volume.state} />}
        icon={<AliIcon name="kuaicunchu" size={28} />}
        headerItems={[
          { label: '卷 ID', value: volume.id },
          { label: '容量 (GiB)', value: volume.size_gib },
          { label: '创建时间', value: formatDateTime(volume.created_at) },
        ]}
        actions={
          <Space>
            {mounted ? (
              <Button
                loading={detachVolume.isPending}
                onClick={() =>
                  Modal.confirm({
                    title: '卸载块存储卷',
                    content: `确定从实例「${volume.mount_name ?? volume.mount_instance_id}」卸载该卷？`,
                    onOk: () => detachVolume.mutateAsync(volume.mount_instance_id!),
                  })
                }
              >
                卸载
              </Button>
            ) : (
              <Button onClick={() => setAttachVisible(true)}>挂载</Button>
            )}
            <Button
              status="danger"
              loading={deleteVolume.isPending}
              onClick={() =>
                Modal.confirm({
                  title: '删除块存储卷',
                  content: `确定删除「${volume.name}」？卷被实例挂载时无法删除。`,
                  okButtonProps: { status: 'danger' },
                  onOk: () => deleteVolume.mutateAsync(undefined),
                })
              }
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
              { label: 'ID', value: volume.id },
              { label: '名称', value: volume.name },
              { label: '容量 (GiB)', value: volume.size_gib },
              { label: '存储类型', value: volume.volume_type ?? volume.storage_class },
              { label: 'StorageClass', value: volume.storage_class },
              { label: 'IOPS', value: volume.iops ?? '—' },
              { label: '加密', value: volume.encrypted ? '是' : '否' },
              { label: '可用区', value: volume.zone ?? '—' },
              { label: '快照数量', value: volume.snapshots_count ?? snapshotItems.length },
              { label: '状态', value: <StatusTag status={volume.state} /> },
              { label: '状态原因', value: volume.reason || '—' },
              { label: '创建时间', value: formatDateTime(volume.created_at) },
              { label: '更新时间', value: formatDateTime(volume.updated_at) },
            ],
          },
          {
            key: 'related-summary',
            title: '关联摘要',
            fields: mounted
              ? [
                  {
                    label: `实例 · ${volume.mount_name ?? volume.mount_instance_id}`,
                    value: (
                      <Button type="text" size="mini" onClick={openMountedInstance}>
                        打开
                      </Button>
                    ),
                  },
                ]
              : [{ label: '暂无关联实例', value: '—' }],
          },
        ]}
        tabs={[
          {
            key: 'related',
            label: '关联资源',
            content: (
              <Card title={`关联实例 ${mounted ? 1 : 0}`} size="small">
                <List
                  dataSource={mounted ? [volume] : []}
                  noDataElement={<Empty description="该卷当前未挂载实例" />}
                  render={() => (
                    <div className="flex w-full items-center gap-3 px-5 py-3">
                      <Tag className="shrink-0">实例</Tag>
                      <span className="min-w-0 flex-1 truncate">{volume.mount_name ?? volume.mount_instance_id}</span>
                      <Typography.Text className="shrink-0" type="secondary">
                        {volume.mount_instance_id}
                      </Typography.Text>
                      <Button type="text" size="mini" onClick={openMountedInstance}>
                        打开
                      </Button>
                    </div>
                  )}
                />
              </Card>
            ),
          },
          {
            key: 'snapshots',
            label: '快照',
            extra: (
              <Button type="primary" onClick={() => setSnapshotVisible(true)}>
                创建快照
              </Button>
            ),
            content: snapshots.error ? (
              <ApiErrorAlert error={snapshots.error} />
            ) : (
              <Table<VolumeSnapshot>
                columns={[
                  { title: '名称', dataIndex: 'name' },
                  { title: '状态', render: (_, row) => <StatusTag status={row.status} /> },
                  { title: '大小', render: (_, row) => formatBytes(row.size_bytes) },
                  { title: '创建时间', render: (_, row) => formatDateTime(row.created_at) },
                ]}
                data={snapshotItems}
                loading={snapshots.isLoading}
                rowKey="id"
                pagination={false}
                noDataElement={<Empty description="暂无快照，点击右上角「创建快照」开始" />}
              />
            ),
          },
          {
            key: 'auto-snapshot',
            label: '自动快照',
            content: unavailable('当前 Core API 暂未提供自动快照策略查询与设置能力'),
          },
          {
            key: 'mount-history',
            label: '挂载历史',
            content: unavailable('当前 Core API 暂未提供卷挂载历史数据'),
          },
          {
            key: 'events',
            label: '事件',
            content: (
              <Space direction="vertical" size={12} className="w-full">
                {volume.reason ? <Alert type="warning" showIcon content={volume.reason} /> : null}
                {unavailable('当前 Core API 暂未提供块存储事件列表')}
              </Space>
            ),
          },
        ]}
        onBack={() => navigate({ to: '/volumes' })}
      />
      <CreateVolumeSnapshotModal
        visible={snapshotVisible}
        volumeId={volumeId}
        onCancel={() => setSnapshotVisible(false)}
      />
      <AttachVolumeModal visible={attachVisible} volumeId={volumeId} onCancel={() => setAttachVisible(false)} />
    </>
  )
}
