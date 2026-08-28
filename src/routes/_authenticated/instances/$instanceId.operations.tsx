import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button, Empty } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import {
  StatusTag,
  DataTable,
  ApiErrorAlert,
} from '@/components/common'
import { formatDateTime } from '@/lib/format'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/instances/$instanceId/operations')({
  component: InstanceOperationsPage,
})

type OpRow = { id: string; operation?: string; status?: string; created_at?: string }

function InstanceOperationsPage() {
  const { instanceId } = Route.useParams()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['instance-ops', instanceId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/instances/{instance_id}/operations', {
        params: { path: { instance_id: instanceId }, query: { limit: 50 } },
      })
      if (error) throw error
      return data
    },
  })

  const items = (data as { items?: OpRow[] })?.items ?? []

  return (
    <>
      <PageHeader
        title="操作历史"
        subtitle={instanceId}
        extra={
          <Button type="text" onClick={() => navigate({ to: '/instances/$instanceId', params: { instanceId } })}>
            返回详情
          </Button>
        }
      />
      <DataTable<OpRow>
        columns={[
          { title: '操作', dataIndex: 'operation' },
          { title: '状态', width: 120, render: (_, r) => <StatusTag status={r.status} /> },
          { title: '时间', render: (_, r) => formatDateTime(r.created_at) },
          {
            title: '',
            render: (_, r) => (
              <Link to="/instance-operations/$operationId" params={{ operationId: r.id }}>
                <Button type="text" size="small">
                  详情
                </Button>
              </Link>
            ),
          },
        ]}
        data={error ? [] : items}
        loading={isLoading}
        pagination={false}
        noDataElement={error ? <ApiErrorAlert error={error} /> : <Empty description="暂无操作记录" />}
      />
    </>
  )
}
