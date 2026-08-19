import { Progress, Spin } from '@arco-design/web-react'
import { useQuery } from '@tanstack/react-query'
import { vmDetailDataSource } from './data-source'
import styles from './detail.module.css'

export function VmMonitorTab({ instanceId }: { instanceId: string }) {
  const query = useQuery({
    queryKey: ['vm-instance-monitor', instanceId],
    queryFn: () => vmDetailDataSource.getMonitor(instanceId),
  })

  if (query.isLoading && !query.data) {
    return (
      <div className={styles.state}>
        <Spin />
        <span>正在加载监控数据...</span>
      </div>
    )
  }

  if (query.isError || !query.data) {
    return <div className={styles.state}>监控数据加载失败</div>
  }

  return (
    <div className={styles.monitorPanel}>
      <div className={styles.monitorGrid}>
        {query.data.metrics.map((metric) => (
          <section key={metric.label} className={styles.monitorMetric}>
            <div className={styles.monitorMetricHeader}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
            <Progress percent={metric.percent} strokeWidth={8} showText={false} />
          </section>
        ))}
      </div>
      <div className={styles.monitorNote}>{query.data.note}</div>
    </div>
  )
}
