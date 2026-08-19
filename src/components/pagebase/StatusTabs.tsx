import styles from './pagebase.module.css'

export type ListStatusTab<T extends string> = {
  value: T
  label: string
  count?: number
}

type StatusTabsProps<T extends string> = {
  items: Array<ListStatusTab<T>>
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
}

export function StatusTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel = '状态筛选',
}: StatusTabsProps<T>) {
  return (
    <div className={styles.statusTabs} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`${styles.statusTab} ${active ? styles.statusTabActive : ''}`}
            onClick={() => onChange(item.value)}
          >
            <span>{item.label}</span>
            {item.count !== undefined ? <span className={styles.statusTabCount}>{item.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
