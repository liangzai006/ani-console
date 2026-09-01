import type { EChartsOption, LineSeriesOption } from 'echarts'
import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { CoreLineBarChart } from '@/components/common'
import type { HomeTimeRange, HomeTrendData } from '../types'
import { PeriodSwitch } from './PeriodSwitch'
import styles from '../home.module.css'

function areaColor(color: string) {
  return color.toUpperCase() === '#67C23A' ? 'rgba(103, 194, 58, 0.12)' : 'rgba(0, 121, 211, 0.15)'
}

export function TrendCard({ data, testId }: { data: HomeTrendData; testId: string }) {
  const [range, setRange] = useState<HomeTimeRange>('7d')
  const current = data.ranges[range]

  const option = useMemo<EChartsOption>(() => {
    const series: LineSeriesOption[] = current.series.map((item) => ({
      name: item.name,
      type: 'line',
      data: item.values,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { color: item.color, width: 1.5 },
      itemStyle: { color: item.color, borderColor: '#fff', borderWidth: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: areaColor(item.color) },
            { offset: 1, color: 'rgba(255, 255, 255, 0)' },
          ],
        },
      },
      emphasis: { focus: 'series' },
    }))

    return {
      animation: false,
      grid: { left: 40, right: 16, top: 8, bottom: 30 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        borderColor: '#fff',
        borderWidth: 2,
        padding: [8, 12],
        textStyle: { color: 'rgba(0, 0, 0, 0.9)', fontSize: 12 },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: current.labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: 'rgba(0, 0, 0, 0.4)', fontSize: 12, margin: 10 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: data.yMax,
        interval: data.yInterval,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: 'rgba(0, 0, 0, 0.4)', fontSize: 12 },
        splitLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.08)', width: 0.5 } },
      },
      series,
    }
  }, [current, data.yInterval, data.yMax])

  return (
    <section className={clsx(styles.panel, styles.trendPanel)} data-testid={`trend-card-${testId}`}>
      <header className={styles.panelHeader}>
        <h2>{data.title}</h2>
        <PeriodSwitch value={range} onChange={setRange} ariaLabel={`${testId}时间范围`} />
      </header>
      <div className={styles.trendHeadlines}>
        {current.headlines.map((headline) => (
          <div key={headline.label} className={styles.trendHeadline}>
            <span className={styles.legendDot} style={{ background: headline.color }} />
            <span className={styles.trendHeadlineLabel}>{headline.label}</span>
            <strong>{headline.value}</strong>
            <span className={styles.trendHeadlineUnit}>{headline.unit}</span>
          </div>
        ))}
      </div>
      <div className={styles.trendChart}>
        <CoreLineBarChart option={option} style={{ width: '100%', height: '100%' }} />
      </div>
    </section>
  )
}
