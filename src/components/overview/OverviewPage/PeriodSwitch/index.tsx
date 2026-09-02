import clsx from 'clsx'
import type { HomeTimeRange } from '../types'
import styles from '../index.module.css'

const PERIODS: Array<{ value: HomeTimeRange; label: string }> = [
  { value: '1d', label: '1 天' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
]

export function PeriodSwitch({
  value,
  onChange,
  ariaLabel = '时间范围',
}: {
  value: HomeTimeRange
  onChange: (value: HomeTimeRange) => void
  ariaLabel?: string
}) {
  return (
    <div className={styles.periodSwitch} role="group" aria-label={ariaLabel}>
      {PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          className={clsx(styles.periodButton, period.value === value && styles.periodButtonActive)}
          aria-pressed={period.value === value}
          onClick={() => onChange(period.value)}
        >
          {period.label}
        </button>
      ))}
    </div>
  )
}
