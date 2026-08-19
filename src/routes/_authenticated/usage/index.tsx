import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, DatePicker, Empty, Form, Input, Select, Space, Spin } from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { CoreLineBarChart } from '@/components/charts/CoreLineBarChart'
import { PageHeader } from '@/components/shell/AppShell'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'
import { MetricCard } from '@/components/dashboard/MetricCard'

export const Route = createFileRoute('/_authenticated/usage/')({ component: UsagePage })

type UsageGroupBy = 'resource_type' | 'az' | 'day' | 'hour'

function defaultRange(): [string, string] {
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000)
  return [start.toISOString(), end.toISOString()]
}

function UsagePage() {
  const [range, setRange] = useState<[string, string]>(() => defaultRange())
  const [appliedRange, setAppliedRange] = useState<[string, string]>(() => defaultRange())
  const [groupBy, setGroupBy] = useState<UsageGroupBy>('day')
  const [appliedGroupBy, setAppliedGroupBy] = useState<UsageGroupBy>('day')
  const [resourceType, setResourceType] = useState('')
  const [appliedResourceType, setAppliedResourceType] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['usage', appliedRange, appliedGroupBy, appliedResourceType],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/metering/usage', {
        params: {
          query: {
            start_time: appliedRange[0],
            end_time: appliedRange[1],
            group_by: appliedGroupBy,
            resource_type: appliedResourceType || undefined,
          },
        },
      })
      if (error) throw error
      return data
    },
  })

  const applyFilters = () => {
    setAppliedRange(range)
    setAppliedGroupBy(groupBy)
    setAppliedResourceType(resourceType.trim())
  }

  const items = (data as { items?: { period?: string; total_quantity?: number }[] } | undefined)?.items ?? []
  const total = items.reduce((acc, i) => acc + (i.total_quantity ?? 0), 0)
  const chart = {
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: items.map((i) => i.period ?? '') },
    yAxis: { type: 'value' as const },
    series: [{ type: 'bar' as const, data: items.map((i) => i.total_quantity ?? 0), itemStyle: { color: '#0079D3' } }],
  }

  return (
    <div className="space-y-4">
      <PageHeader title="用量" subtitle="租户资源计量统计" />
      {error ? <ApiErrorAlert error={error} /> : null}
      <Card>
        <Form layout="vertical">
          <Space wrap align="end">
            <Form.Item label="统计时间">
              <DatePicker.RangePicker
                value={range}
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                onChange={(value) => {
                  if (value?.[0] && value?.[1]) setRange([new Date(value[0]).toISOString(), new Date(value[1]).toISOString()])
                }}
                placeholder={['开始时间', '结束时间']}
              />
            </Form.Item>
            <Form.Item label="分组">
              <Select value={groupBy} onChange={setGroupBy} className="w-[160px]">
                <Select.Option value="day">day</Select.Option>
                <Select.Option value="hour">hour</Select.Option>
                <Select.Option value="resource_type">resource_type</Select.Option>
                <Select.Option value="az">az</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="资源类型">
              <Input value={resourceType} onChange={setResourceType} placeholder="可选" className="w-[180px]" />
            </Form.Item>
            <Button type="primary" onClick={applyFilters}>
              查询
            </Button>
          </Space>
        </Form>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="统计点数" value={items.length} />
        <MetricCard title="总用量" value={total} />
        <MetricCard title="最近一项" value={items.at(-1)?.total_quantity ?? 0} />
      </div>
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spin />
          </div>
        ) : items.length > 0 ? (
          <CoreLineBarChart option={chart} style={{ height: 360 }} />
        ) : (
          <Empty description="暂无用量数据" />
        )}
      </Card>
    </div>
  )
}
