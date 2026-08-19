type UsageLike = {
  period?: string | null
  total_quantity?: number
  resource_type?: string
  unit?: string
}

/** 按 period 聚合用量（group_by=day 时同一 period 可能有多条 resource_type 记录） */
export function aggregateUsageByPeriod(items: UsageLike[]) {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = item.period ?? '—'
    map.set(key, (map.get(key) ?? 0) + (item.total_quantity ?? 0))
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, total_quantity]) => ({
      period: formatUsagePeriod(period),
      total_quantity,
    }))
}

function formatUsagePeriod(period: string): string {
  if (period === '—') return period
  const d = new Date(period)
  if (!Number.isNaN(d.getTime()) && period.includes('T')) {
    return d.toLocaleDateString('zh-CN')
  }
  return period
}
