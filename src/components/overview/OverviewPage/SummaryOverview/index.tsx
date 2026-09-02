import { IconRight } from '@arco-design/web-react/icon'
import { Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { AliIcon } from '@/components/common'
import type { HomeSummaryCard } from '../types'
import styles from '../index.module.css'

export function SummaryOverview({ items }: { items: HomeSummaryCard[] }) {
  return (
    <section className={clsx(styles.panel, styles.summaryPanel)} aria-label="资源总览">
      <div className={styles.summaryGrid}>
        {items.map((item) => (
          <Link key={item.id} to={item.route} className={styles.summaryCard}>
            <span className={styles.summaryDecorLarge} aria-hidden="true" />
            <span className={styles.summaryDecorRing} aria-hidden="true">
              <AliIcon name={item.icon} size={16} />
            </span>
            <span className={styles.summaryLabelRow}>
              <span className={styles.summaryLabel}>{item.label}</span>
              <IconRight className={styles.inlineArrow} aria-hidden="true" />
            </span>
            <strong className={styles.summaryValue}>{item.value}</strong>
            <span className={styles.summaryStatuses}>
              {item.statuses.map((status) => (
                <span key={`${item.id}-${status.label}`} className={styles.summaryStatus}>
                  <span className={clsx(styles.statusDot, styles[`statusDot_${status.tone}`])} />
                  <span>
                    {status.label} <b>{status.value}</b>
                  </span>
                </span>
              ))}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
