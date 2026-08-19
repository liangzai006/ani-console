import { Button, Empty, Spin, Table } from '@arco-design/web-react'
import type { ColumnProps } from '@arco-design/web-react/es/Table'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'

export interface CursorPage<T> {
  items: T[]
  next_cursor?: string | null
}

interface CursorTableProps<T extends object> {
  columns: ColumnProps<T>[]
  data?: CursorPage<T>
  loading?: boolean
  error?: unknown
  rowKey: keyof T | ((row: T) => string)
  onLoadMore?: (cursor: string) => void
  hasMore?: boolean
  emptyDescription?: string
}

export function CursorTable<T extends object>({
  columns,
  data,
  loading,
  error,
  rowKey,
  onLoadMore,
  hasMore,
  emptyDescription = '暂无数据',
}: CursorTableProps<T>) {
  const items = data?.items ?? []

  if (error) return <ApiErrorAlert error={error} />
  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spin />
      </div>
    )
  }
  if (!loading && items.length === 0) {
    return <Empty description={emptyDescription} />
  }

  return (
    <div className="space-y-4">
      <Table columns={columns} data={items} rowKey={rowKey as string} pagination={false} loading={loading} />
      {hasMore && data?.next_cursor ? (
        <div className="flex justify-center">
          <Button type="outline" loading={loading} onClick={() => onLoadMore?.(data.next_cursor!)}>
            加载更多
          </Button>
        </div>
      ) : null}
    </div>
  )
}
