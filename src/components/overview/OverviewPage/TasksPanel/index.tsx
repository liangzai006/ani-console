import { IconCheckCircle, IconClockCircle, IconCloseCircle, IconRight } from '@arco-design/web-react/icon'
import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { useMemo, useState } from 'react'
import type { HomeTask, HomeTaskFilter } from '../types'
import styles from '../index.module.css'

export function TasksPanel({ items }: { items: HomeTask[] }) {
  const [filter, setFilter] = useState<HomeTaskFilter>('done')
  const currentCount = items.filter((item) => item.status === 'current').length
  const visibleItems = useMemo(
    () => items.filter((item) => (filter === 'current' ? item.status === 'current' : item.status !== 'current')),
    [filter, items],
  )

  return (
    <section className={clsx(styles.panel, styles.taskPanel)} data-testid="tasks-panel">
      <header className={styles.panelHeader}>
        <h2>任务中心</h2>
        <Link to="/vm-instances" className={styles.viewAllLink}>
          查看全部
          <IconRight aria-hidden="true" />
        </Link>
      </header>
      <div className={styles.tabBar} role="tablist" aria-label="任务状态">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'done'}
          className={clsx(styles.tabButton, filter === 'done' && styles.tabButtonActive)}
          onClick={() => setFilter('done')}
        >
          已完成
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'current'}
          className={clsx(styles.tabButton, filter === 'current' && styles.tabButtonActive)}
          onClick={() => setFilter('current')}
        >
          当前任务 {currentCount}
        </button>
      </div>

      <div className={styles.taskList}>
        {visibleItems.map((item) => (
          <button key={item.id} type="button" className={styles.taskItem}>
            <span className={clsx(styles.taskIcon, styles[`taskIcon_${item.status}`])}>
              {item.status === 'done' ? <IconCheckCircle /> : null}
              {item.status === 'failed' ? <IconCloseCircle /> : null}
              {item.status === 'current' ? <IconClockCircle /> : null}
            </span>
            <span className={styles.taskText}>
              <span className={styles.taskName}>{item.title}</span>
              <span className={styles.mutedText}>{item.subtitle}</span>
            </span>
            {item.status === 'current' ? (
              <span className={styles.taskProgress} aria-label={`进度 ${item.progress ?? 0}%`}>
                <span style={{ width: `${item.progress ?? 0}%` }} />
              </span>
            ) : (
              <span className={styles.taskTime}>{item.time}</span>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}
