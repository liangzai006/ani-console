import { IconRight } from '@arco-design/web-react/icon'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { HomeCpuItem, HomeMonitorSource } from '../types'
import styles from '../home.module.css'

function tone(value: number) {
  if (value > 90) return 'danger'
  if (value >= 70) return 'warning'
  return 'normal'
}

export function TopCpuPanel({ data }: { data: Record<HomeMonitorSource, HomeCpuItem[]> }) {
  const [source, setSource] = useState<HomeMonitorSource>('external')
  const items = data[source]

  return (
    <section className={`${styles.panel} ${styles.topCpuPanel}`} data-testid="top-cpu-panel">
      <header className={styles.panelHeader}>
        <h2>TOP5云主机CPU负载</h2>
        <div className={styles.monitorSwitch} role="group" aria-label="监控来源">
          <button
            type="button"
            aria-pressed={source === 'external'}
            className={source === 'external' ? styles.monitorButtonActive : ''}
            onClick={() => setSource('external')}
          >
            外部监控
          </button>
          <button
            type="button"
            aria-pressed={source === 'internal'}
            className={source === 'internal' ? styles.monitorButtonActive : ''}
            onClick={() => setSource('internal')}
          >
            内部监控
          </button>
        </div>
      </header>
      <div className={styles.cpuList}>
        {items.map((item, index) => {
          const itemTone = tone(item.value)
          return (
            <div key={item.id} className={styles.cpuItem}>
              <span className={`${styles.cpuRank} ${styles[`cpuRank_${itemTone}`]}`}>{index + 1}</span>
              <Link to="/instances/vm/$instanceId" params={{ instanceId: item.instanceId }} className={styles.cpuName}>
                {item.name}
                <IconRight aria-hidden="true" />
              </Link>
              <div className={styles.cpuBarRow}>
                <span className={styles.cpuBarTrack}>
                  <span className={`${styles.cpuBar} ${styles[`cpuBar_${itemTone}`]}`} style={{ width: `${item.value}%` }} />
                </span>
                <span className={`${styles.cpuValue} ${styles[`cpuValue_${itemTone}`]}`}>{item.value.toFixed(2)} %</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
