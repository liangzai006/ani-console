import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Button, Select, type ButtonProps } from '@arco-design/web-react'
import styles from './pagebase.module.css'

export type ListSortDirection = 'asc' | 'desc'

export type ListColumn<T> = {
  key: string
  title: ReactNode
  width?: number | string
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  cellClassName?: string | ((row: T) => string)
  headerClassName?: string
  sortable?: boolean
  sortDirection?: ListSortDirection
  onSort?: () => void
  render: (row: T) => ReactNode
}

export type ListPagination = {
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

type DataTableProps<T> = {
  rows: T[]
  rowKey: (row: T) => string
  columns: Array<ListColumn<T>>
  selectedKeys?: string[]
  onSelectedKeysChange?: (keys: string[]) => void
  selectable?: boolean
  pagination: ListPagination
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyIconClassName?: string
  emptyText?: string
  tableLabel?: string
  preserveTableOnEmpty?: boolean
  renderRowActions?: (row: T) => ReactNode
}

function SelectionCheckbox({
  checked,
  indeterminate = false,
  label,
  onChange,
}: {
  checked: boolean
  indeterminate?: boolean
  label: string
  onChange: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <input
      ref={inputRef}
      type="checkbox"
      className={styles.selectionCheckbox}
      checked={checked}
      aria-label={label}
      onChange={onChange}
    />
  )
}

function pageNumbers(current: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  const values: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(totalPages - 1, current + 1)
  if (start > 2) values.push('ellipsis')
  for (let page = start; page <= end; page += 1) values.push(page)
  if (end < totalPages - 1) values.push('ellipsis')
  values.push(totalPages)
  return values
}

function Pagination({ pagination }: { pagination: ListPagination }) {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  const currentPage = Math.min(pagination.page, totalPages)
  const pages = pageNumbers(currentPage, totalPages)

  return (
    <div className={styles.pagination} aria-label="表格分页">
      <span className={styles.paginationInfo}>共 {pagination.total} 条记录</span>
      <button
        type="button"
        className={styles.paginationButton}
        disabled={currentPage <= 1}
        aria-label="上一页"
        onClick={() => pagination.onPageChange(currentPage - 1)}
      >
        <i className="iconfont icon-left-arrow" aria-hidden="true" />
      </button>
      <div className={styles.paginationPages}>
        {pages.map((page, index) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className={styles.paginationEllipsis}>
              ···
            </span>
          ) : (
            <button
              type="button"
              key={page}
              className={`${styles.paginationButton} ${page === currentPage ? styles.paginationButtonActive : ''}`}
              aria-label={`第 ${page} 页`}
              aria-current={page === currentPage ? 'page' : undefined}
              onClick={() => pagination.onPageChange(page)}
            >
              {page}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        className={styles.paginationButton}
        disabled={currentPage >= totalPages}
        aria-label="下一页"
        onClick={() => pagination.onPageChange(currentPage + 1)}
      >
        <i className="iconfont icon-right-arrow" aria-hidden="true" />
      </button>
      <span className={styles.paginationDivider} />
      <Select
        className={styles.paginationSelect}
        aria-label="每页条数"
        value={pagination.pageSize}
        onChange={(value) => pagination.onPageSizeChange(Number(value))}
        options={(pagination.pageSizeOptions ?? [10, 20, 50]).map((size) => ({
          value: size,
          label: `${size} 条/页`,
        }))}
      />
      <span className={styles.paginationDivider} />
      <label className={styles.paginationJump}>
        <span>前往</span>
        <input
          key={currentPage}
          className={styles.paginationJumpInput}
          type="number"
          min={1}
          max={totalPages}
          defaultValue={currentPage}
          aria-label="跳转页码"
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            const targetPage = Number(event.currentTarget.value)
            if (targetPage >= 1 && targetPage <= totalPages) pagination.onPageChange(targetPage)
          }}
        />
        <span>页</span>
      </label>
    </div>
  )
}

export function DataTable<T>({
  rows,
  rowKey,
  columns,
  selectedKeys = [],
  onSelectedKeysChange = () => undefined,
  selectable = true,
  pagination,
  loading = false,
  error,
  onRetry,
  emptyIconClassName = 'icon-yunzhuji',
  emptyText = '暂无数据',
  tableLabel = '数据列表',
  preserveTableOnEmpty = false,
  renderRowActions,
}: DataTableProps<T>) {
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const pageKeys = useMemo(() => rows.map(rowKey), [rowKey, rows])
  const selectedOnPage = pageKeys.filter((key) => selectedSet.has(key))
  const allChecked = pageKeys.length > 0 && selectedOnPage.length === pageKeys.length
  const indeterminate = selectedOnPage.length > 0 && !allChecked

  const toggleAll = () => {
    const next = new Set(selectedKeys)
    if (allChecked) pageKeys.forEach((key) => next.delete(key))
    else pageKeys.forEach((key) => next.add(key))
    onSelectedKeysChange([...next])
  }

  const toggleRow = (key: string) => {
    const next = new Set(selectedKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onSelectedKeysChange([...next])
  }

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, key: string) => {
    const target = event.target as Element
    if (target.closest('a, button, input, select, [data-stop-row-click]')) return
    toggleRow(key)
  }

  return (
    <div className={styles.dataRegion}>
      <div className={styles.tableViewport}>
        {loading ? (
          <div className={styles.tableState} role="status">
            <span className={styles.loadingSpinner} />
            <span>正在加载...</span>
          </div>
        ) : error ? (
          <div className={styles.tableState} role="alert">
            <i className="iconfont icon-error-circle" aria-hidden="true" />
            <span>{error}</span>
            {onRetry ? (
              <button type="button" className={styles.retryButton} onClick={onRetry}>
                重新加载
              </button>
            ) : null}
          </div>
        ) : rows.length === 0 && !preserveTableOnEmpty ? (
          <div className={styles.tableState}>
            <i className={`iconfont ${emptyIconClassName} ${styles.emptyIcon}`} aria-hidden="true" />
            <span>{emptyText}</span>
          </div>
        ) : (
          <table className={styles.dataTable} aria-label={tableLabel}>
            <thead>
              <tr>
                {selectable ? (
                  <th className={styles.checkboxColumn}>
                    <SelectionCheckbox
                      checked={allChecked}
                      indeterminate={indeterminate}
                      label="选择当前页全部数据"
                      onChange={toggleAll}
                    />
                  </th>
                ) : null}
                {columns.map((column) => {
                  const columnStyle: CSSProperties = {
                    width: column.width,
                    minWidth: column.minWidth,
                    textAlign: column.align,
                  }
                  return (
                    <th key={column.key} style={columnStyle} className={column.headerClassName}>
                      {column.sortable ? (
                        <button type="button" className={styles.sortButton} onClick={column.onSort}>
                          <span>{column.title}</span>
                          <i
                            className={`iconfont icon-down-chevron-small ${
                              column.sortDirection === 'asc' ? styles.sortAscending : ''
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                      ) : (
                        column.title
                      )}
                    </th>
                  )
                })}
                {renderRowActions ? (
                  <th className={styles.rowActionsColumn}>
                    <span className={styles.visuallyHidden}>操作</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (renderRowActions ? 1 : 0)}>
                    <div className={styles.tableState}>
                      <i className={`iconfont ${emptyIconClassName} ${styles.emptyIcon}`} aria-hidden="true" />
                      <span>{emptyText}</span>
                    </div>
                  </td>
                </tr>
              ) : rows.map((row) => {
                const key = rowKey(row)
                const selected = selectedSet.has(key)
                return (
                  <tr
                    key={key}
                    className={selected ? styles.selectedRow : ''}
                    aria-selected={selectable ? selected : undefined}
                    onClick={selectable ? (event) => handleRowClick(event, key) : undefined}
                  >
                    {selectable ? (
                      <td className={styles.checkboxColumn}>
                        <SelectionCheckbox
                          checked={selected}
                          label={`选择数据 ${key}`}
                          onChange={() => toggleRow(key)}
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={
                          typeof column.cellClassName === 'function' ? column.cellClassName(row) : column.cellClassName
                        }
                        style={{ width: column.width, minWidth: column.minWidth, textAlign: column.align }}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                    {renderRowActions ? (
                      <td className={styles.rowActionsColumn}>{renderRowActions(row)}</td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <Pagination pagination={pagination} />
    </div>
  )
}

export function ListRowActions({ children }: { children: ReactNode }) {
  return <div className={styles.rowActions}>{children}</div>
}

export function ListNameCell({ name, id }: { name: ReactNode; id: ReactNode }) {
  return (
    <div className={styles.listNameCell}>
      <span className={styles.listName}>{name}</span>
      <span className={styles.listNameId}>{id}</span>
    </div>
  )
}

export const ListRowActionButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & { children: ReactNode }
>(function ListRowActionButton({ children, ...buttonProps }, ref) {
  return (
    <Button ref={ref} type="text" size="small" className={styles.rowActionButton} {...buttonProps}>
      {children}
    </Button>
  )
})
