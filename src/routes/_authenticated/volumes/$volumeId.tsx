import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Descriptions, Space, Spin } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { CursorTable } from '@/components/tables/CursorTable'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'
import { newIdempotencyKey } from '@/lib/idempotency'
import { showApiError } from '@/api/helpers'
import { listOrThrow } from '@/lib/api-list'

export const Route = createFileRoute('/_authenticated/volumes/$volumeId')({
  component: VolumeDetailPage,
})

function VolumeDetailPage() {
  const { volumeId } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

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
          params: { path: { volume_id: volumeId }, query: { limit: 50 } },
        }),
      ),
  })

  const createSnapshot = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.POST('/volumes/{volume_id}/snapshots', {
        params: { path: { volume_id: volumeId } },
        body: { name: `snap-${Date.now()}`, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['volume-snapshots', volumeId] }),
    onError: (e) => showApiError(e),
  })

  if (detail.isLoading && !detail.data) {
    return (
      <div className="space-y-5">
        <PageHeader title="块存储卷详情" subtitle="加载中…" />
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      </div>
    )
  }

  if (detail.error) return <ApiErrorAlert error={detail.error} />

  const v = detail.data
  const snapshotItems = (snapshots.data?.items ?? []) as { id: string; name?: string }[]

  return (
    <div className="space-y-5">
      <PageHeader
        title={v?.name ?? volumeId}
        subtitle="块存储卷详情"
        extra={
          <Space wrap>
            <Button type="primary" loading={createSnapshot.isPending} onClick={() => createSnapshot.mutateAsync()}>
              创建快照
            </Button>
            <Button type="text" onClick={() => navigate({ to: '/volumes' })}>
              返回列表
            </Button>
          </Space>
        }
      />
      <Card>
        <Descriptions
          column={{ xs: 1, sm: 2, md: 3 }}
          data={[
            { label: 'ID', value: v?.id },
            { label: '容量 (GiB)', value: String(v?.size_gib ?? '—') },
            { label: '存储类', value: v?.storage_class ?? '—' },
          ]}
        />
      </Card>
      <Card title="快照">
        <CursorTable
          columns={[
            { title: 'ID', dataIndex: 'id' },
            { title: '名称', dataIndex: 'name' },
          ]}
          data={{ items: snapshotItems, next_cursor: snapshots.data?.next_cursor }}
          loading={snapshots.isLoading}
          error={snapshots.error}
          rowKey="id"
          emptyDescription="暂无快照，点击上方创建快照"
        />
      </Card>
    </div>
  )
}
