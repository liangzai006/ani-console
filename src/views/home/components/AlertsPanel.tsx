import { IconRight } from '@arco-design/web-react/icon'
import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { HomeAlert, HomeAlertFilter } from '../types'
import styles from '../home.module.css'

const FILTERS: Array<{ value: HomeAlertFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'critical', label: '严重' },
  { value: 'warning', label: '警告' },
  { value: 'info', label: '提示' },
]

const LEVEL_LABELS = { info: '提示', critical: '严重', warning: '警告' } as const

export function AlertsPanel({ items, total }: { items: HomeAlert[]; total: number }) {
  const [filter, setFilter] = useState<HomeAlertFilter>('all')
  const counts = useMemo(
    () => ({
      all: items.length,
      critical: items.filter((item) => item.level === 'critical').length,
      warning: items.filter((item) => item.level === 'warning').length,
      info: items.filter((item) => item.level === 'info').length,
    }),
    [items],
  )
  const visibleItems = filter === 'all' ? items : items.filter((item) => item.level === filter)

  return (
    <section className={`${styles.panel} ${styles.sidePanel}`} data-testid="alerts-panel">
      <header className={styles.panelHeader}>
        <div className={styles.titleWithBadge}>
          <h2>最近告警</h2>
          <span>{total}</span>
        </div>
        <Link to="/observability" className={styles.viewAllLink}>
          查看全部
          <IconRight aria-hidden="true" />
        </Link>
      </header>

      <div className={styles.tabBar} role="tablist" aria-label="告警等级">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            className={`${styles.tabButton} ${filter === item.value ? styles.tabButtonActive : ''}`}
            onClick={() => setFilter(item.value)}
          >
            {item.label} {counts[item.value]}
          </button>
        ))}
      </div>

      <div className={styles.alertList}>
        {visibleItems.map((item) => (
          <button key={item.id} type="button" className={styles.alertItem}>
            <span className={`${styles.alertBar} ${styles[`alertBar_${item.level}`]}`} />
            <span className={styles.alertText}>
              <span className={styles.alertName}>{item.name}</span>
              <span className={styles.mutedText}>{item.target}</span>
            </span>
            <span className={styles.alertMeta}>
              <span className={`${styles.alertTag} ${styles[`alertTag_${item.level}`]}`}>
                {LEVEL_LABELS[item.level]}
              </span>
              <span className={styles.mutedText}>{item.time}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
