import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, Empty, Grid, Spin } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { CorePieChart } from '@/components/common/CorePieChart'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { PageHeader } from '@/components/shell/AppShell'
import { DataTable } from '@/components/common/DataTable'
import { ApiErrorAlert } from '@/components/common/ApiErrorAlert'
import { StatusTag } from '@/components/common/StatusTag'
import type { components } from '@/api/core-schema'

export const Route = createFileRoute('/_authenticated/gpu-inventory/')({
  component: GpuInventoryPage,
})

const CHART_COLORS = ['#0079D3', '#00B42A']

type GpuRecord = components['schemas']['GPUInventoryRecord']

function gpuOccupancyExtra(o: components['schemas']['GPUOccupancyStats'] | undefined): string {
  if (!o) return '已用 0 / 可用 0'
  const fault = o.fault > 0 ? ` / 故障 ${o.fault}` : ''
  return `已用 ${o.in_use} / 可用 ${o.available}${fault}`
}

function GpuInventoryPage() {
  const list = useQuery({
    queryKey: ['gpu-inventory'],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/gpu-inventory')
      if (error) throw error
      return data
    },
  })
  const occ = useQuery({
    queryKey: ['gpu-occupancy'],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/gpu-inventory/occupancy')
      if (error) throw error
      return data
    },
  })

  const items = (list.data?.items ?? []) as GpuRecord[]
  const o = occ.data

  const chart = {
    color: CHART_COLORS,
    series: [
      {
        type: 'pie' as const,
        radius: ['40%', '70%'],
        data: [
          { name: '使用中', value: o?.in_use ?? 0 },
          { name: '可用', value: o?.available ?? 0 },
          ...(o?.fault ? [{ name: '故障', value: o.fault }] : []),
        ],
      },
    ],
  }

  const summaryLoading = occ.isLoading
  const summaryError = occ.error

  return (
    <div className="space-y-5">
      <PageHeader title="GPU 算力管理" subtitle="设备库存与占用分布" />
      {summaryError ? <ApiErrorAlert error={summaryError} title="占用数据加载失败" /> : null}
      <Grid.Row gutter={16}>
        <Grid.Col xs={24} md={8}>
          {summaryLoading ? (
            <Card className="flex h-full min-h-[120px] items-center justify-center">
              <Spin />
            </Card>
          ) : (
            <MetricCard
              title="GPU 总量"
              value={o?.total ?? '—'}
              extra={gpuOccupancyExtra(o)}
            />
          )}
        </Grid.Col>
        <Grid.Col xs={24} md={16}>
          <Card title="占用分布">
            {summaryLoading ? (
              <div className="flex justify-center py-12">
                <Spin />
              </div>
            ) : (
              <CorePieChart option={chart} className="h-[200px] w-full" />
            )}
          </Card>
        </Grid.Col>
      </Grid.Row>
      <DataTable<GpuRecord>
        columns={[
          { title: '节点', dataIndex: 'node_name' },
          { title: '型号', dataIndex: 'gpu_type' },
          { title: '索引', dataIndex: 'gpu_index' },
          { title: '状态', width: 120, render: (_, r) => <StatusTag status={r.status} /> },
        ]}
        data={list.error ? [] : items}
        loading={list.isLoading}
        pagination={false}
        noDataElement={
          list.error ? <ApiErrorAlert error={list.error} /> : <Empty description="暂无 GPU 设备数据" />
        }
      />
    </div>
  )
}
