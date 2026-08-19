import type { EChartsOption } from 'echarts'
import { useState } from 'react'
import { CorePieChart } from '@/components/charts/CorePieChart'
import type { HomeTimeRange, HomeUsageMetric } from '../types'
import { PeriodSwitch } from './PeriodSwitch'
import styles from '../home.module.css'

function usageOption(metric: HomeUsageMetric): EChartsOption {
  return {
    animation: false,
    tooltip: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['88%', '100%'],
        center: ['50%', '50%'],
        startAngle: 90,
        clockwise: true,
        silent: true,
        label: { show: false },
        data: [
          { value: metric.percent, itemStyle: { color: metric.color } },
          { value: 100 - metric.percent, itemStyle: { color: '#E7E7E7' } },
        ],
      },
    ],
  }
}

export function UsagePanel({ data }: { data: Record<HomeTimeRange, HomeUsageMetric[]> }) {
  const [range, setRange] = useState<HomeTimeRange>('7d')
  const metrics = data[range]

  return (
    <section className={`${styles.panel} ${styles.usagePanel}`} data-testid="usage-panel">
      <header className={styles.panelHeader}>
        <h2>资源使用率</h2>
        <PeriodSwitch value={range} onChange={setRange} ariaLabel="资源使用率时间范围" />
      </header>
      <div className={styles.usageContent}>
        {metrics.map((metric, index) => (
          <div key={metric.id} className={styles.usageColumn}>
            <div className={styles.donutGroup}>
              <div className={styles.donutChart}>
                <CorePieChart option={usageOption(metric)} style={{ width: 88, height: 88 }} />
                <strong>
                  {metric.percent}<span>%</span>
                </strong>
              </div>
              <b className={styles.usageLabel}>{metric.label}</b>
            </div>
            <div className={styles.usageLegend}>
              <div>
                <span><i style={{ background: metric.color }} />已使用</span>
                <strong>{metric.used}<em>{metric.unit}</em></strong>
              </div>
              <div>
                <span><i style={{ background: '#E7E7E7' }} />可使用</span>
                <strong>{metric.available}<em>{metric.unit}</em></strong>
              </div>
            </div>
            {index === 0 ? <span className={styles.usageDivider} aria-hidden="true" /> : null}
          </div>
        ))}
      </div>
    </section>
  )
}
