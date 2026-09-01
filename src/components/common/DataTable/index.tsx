import { forwardRef, type ReactNode } from "react";
import {
  Button,
  Table,
  type ButtonProps,
  type TableColumnProps,
  type TableProps,
} from "@arco-design/web-react";
import styles from "./index.module.css";

export type ListColumn<T> = TableColumnProps<T>;

export type ListPagination = {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export type DataTableProps<T> = {
  className?: string;
  data: T[];
  rowKey?: string | ((row: T) => string);
  columns: Array<TableColumnProps<T>>;
  rowSelection?: TableProps<T>["rowSelection"];
  pagination: ListPagination | false;
  loading?: boolean;
  noDataElement?: ReactNode;
  tableLabel?: string;
  scroll?: TableProps<T>["scroll"];
};

export function DataTable<T>({
  className,
  data,
  rowKey = "id",
  columns,
  rowSelection,
  pagination,
  loading = false,
  noDataElement,
  tableLabel = "数据列表",
  scroll,
}: DataTableProps<T>) {
  const tablePagination =
    pagination === false
      ? false
      : {
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: Math.max(pagination.total, 1),
          sizeCanChange: true,
          sizeOptions: pagination.pageSizeOptions ?? [10, 20, 50],
          pageSizeChangeResetCurrent: true,
          hideOnSinglePage: false,
          showTotal: () => `共 ${pagination.total} 条记录`,
          showJumper: true,
        };

  return (
    <Table<T>
      className={className}
      aria-label={tableLabel}
      rowKey={rowKey}
      columns={columns}
      data={data}
      loading={loading}
      noDataElement={noDataElement}
      pagination={tablePagination}
      tableLayoutFixed
      onChange={
        pagination === false
          ? undefined
          : (nextPagination, _sorter, _filters, extra) => {
              if (extra.action !== "paginate") return;
              const nextPageSize = nextPagination.pageSize ?? pagination.pageSize;
              const nextPage = nextPagination.current ?? pagination.page;
              if (nextPageSize !== pagination.pageSize) {
                pagination.onPageSizeChange(nextPageSize);
                return;
              }
              if (nextPage !== pagination.page) pagination.onPageChange(nextPage);
            }
      }
      border={false}
      hover
      scroll={{ x: "max-content", ...scroll }}
      rowSelection={rowSelection}
    />
  );
}

export function DataTableRowActions({ children }: { children: ReactNode }) {
  return <div className={styles.rowActions}>{children}</div>;
}

export function DataTableNameCell({
  name,
  id,
}: {
  name: ReactNode;
  id: ReactNode;
}) {
  return (
    <div className={styles.nameCell}>
      <span className={styles.name}>{name}</span>
      <span className={styles.nameId}>{id}</span>
    </div>
  );
}

export const DataTableRowActionButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & { children: ReactNode }
>(function DataTableRowActionButton({ children, ...buttonProps }, ref) {
  return (
    <Button
      ref={ref}
      type="text"
      size="small"
      {...buttonProps}
      className={styles.rowActionButton}
    >
      {children}
    </Button>
  );
});
