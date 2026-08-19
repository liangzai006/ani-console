import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Descriptions, Modal, Space, Spin } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { CursorTable } from '@/components/tables/CursorTable'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'
import { listOrThrow } from '@/lib/api-list'
import { showApiError } from '@/api/helpers'

export const Route = createFileRoute('/_authenticated/filesystems/$filesystemId')({
  component: FilesystemDetailPage,
})

function FilesystemDetailPage() {
  const { filesystemId } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const detail = useQuery({
    queryKey: ['filesystem', filesystemId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/filesystems/{filesystem_id}', {
        params: { path: { filesystem_id: filesystemId } },
      })
      if (error) throw error
      return data
    },
  })

  const mounts = useQuery({
    queryKey: ['filesystem-mounts', filesystemId],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET('/filesystems/{filesystem_id}/mount-targets', {
          params: { path: { filesystem_id: filesystemId }, query: { limit: 50 } },
        }),
      ),
  })

  const deleteFilesystem = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.DELETE('/filesystems/{filesystem_id}', {
        params: { path: { filesystem_id: filesystemId } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['filesystems'] })
      navigate({ to: '/filesystems' })
    },
    onError: (e) => showApiError(e),
  })

  if (detail.isLoading && !detail.data) {
    return (
      <div className="space-y-5">
        <PageHeader title="文件系统详情" subtitle="加载中…" />
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      </div>
    )
  }

  if (detail.error) return <ApiErrorAlert error={detail.error} />

  const fs = detail.data
  const mountItems = (mounts.data?.items ?? []) as { id: string; vpc_id?: string; subnet_id?: string }[]

  return (
    <div className="space-y-5">
      <PageHeader
        title={fs?.name ?? filesystemId}
        subtitle="文件系统详情"
        extra={
          <Space>
            <Button
              type="outline"
              status="danger"
              loading={deleteFilesystem.isPending}
              onClick={() =>
                Modal.confirm({
                  title: '删除文件系统',
                  content: `确定删除「${fs?.name ?? filesystemId}」？`,
                  onOk: () => deleteFilesystem.mutateAsync(),
                })
              }
            >
              删除
            </Button>
            <Button type="text" onClick={() => navigate({ to: '/filesystems' })}>
              返回列表
            </Button>
          </Space>
        }
      />
      <Card>
        <Descriptions
          column={{ xs: 1, sm: 2, md: 3 }}
          data={[
            { label: 'ID', value: fs?.id },
            { label: '协议', value: fs?.protocol ?? '—' },
            { label: '容量 (GiB)', value: String(fs?.size_gib ?? '—') },
          ]}
        />
      </Card>
      <Card title="挂载目标">
        <CursorTable
          columns={[
            { title: 'ID', dataIndex: 'id' },
            { title: 'VPC', dataIndex: 'vpc_id' },
            { title: '子网', dataIndex: 'subnet_id' },
          ]}
          data={{ items: mountItems, next_cursor: mounts.data?.next_cursor }}
          loading={mounts.isLoading}
          error={mounts.error}
          rowKey="id"
          emptyDescription="暂无挂载目标"
        />
      </Card>
    </div>
  )
}
