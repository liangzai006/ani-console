import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Select } from '@arco-design/web-react'
import styles from '../PageBaseStyles/index.module.css'

type ListToolbarProps = {
  actions?: ReactNode
  filters?: ReactNode
  tools?: ReactNode
}

export function ListToolbar({ actions, filters, tools }: ListToolbarProps) {
  return (
    <div className={styles.toolbar}>
      {actions ? <div className={styles.toolbarActions}>{actions}</div> : null}
      {filters ? <div className={styles.toolbarFilters}>{filters}</div> : null}
      {tools ? <div className={styles.toolbarTools}>{tools}</div> : null}
    </div>
  )
}

type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  iconClassName?: string
  variant?: 'primary' | 'outline' | 'secondary' | 'danger'
}

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(function ToolbarButton(
  { iconClassName, variant = 'outline', className = '', children, ...buttonProps },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.toolbarButton} ${styles[`toolbarButton_${variant}`]} ${className}`}
      {...buttonProps}
    >
      {iconClassName ? <i className={`iconfont ${iconClassName}`} aria-hidden="true" /> : null}
      {children}
    </button>
  )
})

type ToolbarIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  iconClassName: string
  label: string
  spinning?: boolean
}

export const ToolbarIconButton = forwardRef<HTMLButtonElement, ToolbarIconButtonProps>(function ToolbarIconButton(
  { iconClassName, label, spinning = false, className = '', ...buttonProps },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`${styles.toolbarIconButton} ${spinning ? styles.spinning : ''} ${className}`}
      {...buttonProps}
    >
      <i className={`iconfont ${iconClassName}`} aria-hidden="true" />
    </button>
  )
})

export type SearchField<T extends string> = {
  value: T
  label: string
}

type ToolbarSearchProps<T extends string> = {
  fields: Array<SearchField<T>>
  field: T
  value: string
  placeholder?: string
  onFieldChange: (field: T) => void
  onChange: (value: string) => void
}

export function ToolbarSearch<T extends string>({
  fields,
  field,
  value,
  placeholder = '请输入搜索内容',
  onFieldChange,
  onChange,
}: ToolbarSearchProps<T>) {
  const inputId = useId()

  return (
    <div className={styles.searchControl}>
      <Select
        aria-label="搜索字段"
        className={styles.searchField}
        value={field}
        bordered={false}
        onChange={(value) => onFieldChange(value as T)}
        options={fields}
      />
      <label className={styles.visuallyHidden} htmlFor={inputId}>
        搜索内容
      </label>
      <input
        id={inputId}
        className={styles.searchInput}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className={styles.searchIcon} aria-hidden="true">
        <i className="iconfont icon-search" />
      </span>
    </div>
  )
}
