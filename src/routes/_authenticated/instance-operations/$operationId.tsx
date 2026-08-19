import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, Descriptions, Spin } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { StatusTag } from '@/components/shell/StatusTag'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'
import { CursorTable } from '@/components/tables/CursorTable'
import { formatDateTime } from '@/lib/format'

export const Route = createFileRoute('/_authenticated/instance-operations/$operationId')({ component: OperationDetailPage })

function OperationDetailPage() {
  const { operationId } = Route.useParams()
  const { data, isLoading, error } = useQuery({ queryKey: ['operation', operationId], queryFn: async () => { const { data, error } = await coreApi.GET('/instance-operations/{operation_id}', { params: { path: { operation_id: operationId } } }); if (error) throw error; return data } })
  if (error) return <ApiErrorAlert error={error} />
  if (isLoading && !data) return <div className="space-y-5"><PageHeader title={`操作 ${operationId}`} subtitle="加载中…" /><div className="flex justify-center py-16"><Spin /></div></div>
  const stepItems = (data?.steps ?? []) as { step_name?: string; status?: string; message?: string; started_at?: string | null; completed_at?: string | null }[]
  return <div className="space-y-5"><PageHeader title={`操作 ${operationId}`} extra={<Link to="/instances">返回实例</Link>} /><Card><Descriptions column={{ xs: 1, sm: 2 }} data={[{ label: '操作', value: data?.operation }, { label: '状态', value: <StatusTag status={data?.status} /> }, { label: '实例', value: data?.instance_id }, { label: '发起人', value: data?.requested_by }, { label: '创建时间', value: formatDateTime(data?.created_at) }, { label: '失败原因', value: data?.failure_reason ?? '—' }]} /></Card><Card title="执行步骤"><CursorTable columns={[{ title: '步骤', dataIndex: 'step_name' }, { title: '状态', render: (_, r) => <StatusTag status={r.status} /> }, { title: '开始时间', render: (_, r) => formatDateTime(r.started_at) }, { title: '结束时间', render: (_, r) => formatDateTime(r.completed_at) }, { title: '信息', dataIndex: 'message' }]} data={{ items: stepItems }} rowKey={(r) => `${r.step_name}-${r.started_at ?? ''}`} emptyDescription="暂无步骤信息" /></Card></div>
}
