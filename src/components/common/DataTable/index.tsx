import clsx from "clsx";
import type { ReactNode } from "react";
import { Table, type TableColumnProps, type TableProps } from "@arco-design/web-react";
import { DataTableSectionHeader, type DataTableSectionHeaderProps } from "./DataTableSectionHeader";
import {
  getRowActionsColumnWidth,
  normalizeDataTableColumns,
  resolveDataTableScroll,
} from "./layout";
import { ConfiguredDataTableRowActions } from "./RowActions";
import type { RowAction } from "./types";
import styles from "./index.module.css";

export { DataTableRowActionButton, DataTableRowActions } from "./RowActions";
export type { RowAction, RowActionIntent } from "./types";
export type { DataTableSectionHeaderProps } from "./DataTableSectionHeader";

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
  header?: DataTableSectionHeaderProps;
  data: T[];
  rowKey?: string | ((row: T) => string);
  columns: Array<TableColumnProps<T>>;
  rowSelection?: TableProps<T>["rowSelection"];
  pagination: ListPagination | false;
  loading?: boolean;
  noDataElement?: ReactNode;
  tableLabel?: string;
  scroll?: TableProps<T>["scroll"];
  rowActions?: Array<RowAction<T>>;
};

export function DataTable<T>({
  className,
  header,
  data,
  rowKey = "id",
  columns,
  rowSelection,
  pagination,
  loading = false,
  noDataElement,
  tableLabel = "数据列表",
  scroll,
  rowActions,
}: DataTableProps<T>) {
  const hasConfiguredRowActions = Boolean(rowActions?.length);
  const hasRowActions = Boolean(
    rowActions?.some((action) => data.some((record) => action.visible?.(record) !== false)),
  );
  if (
    hasConfiguredRowActions &&
    columns.some((column) => column.key === "__actions" || column.key === "actions")
  ) {
    throw new Error("DataTable cannot combine rowActions with a manual actions column");
  }

  const columnsWithActions: Array<TableColumnProps<T>> =
    hasRowActions && rowActions
      ? [
          ...columns,
          {
            key: "__actions",
            title: null,
            fixed: scroll?.x === false ? undefined : "right",
            width: getRowActionsColumnWidth(),
            render: (_value, record) => (
              <ConfiguredDataTableRowActions actions={rowActions} record={record} />
            ),
          },
        ]
      : columns;
  const resolvedColumns = hasRowActions
    ? normalizeDataTableColumns(columnsWithActions)
    : columnsWithActions;
  const resolvedScroll = hasRowActions
    ? resolveDataTableScroll(resolvedColumns, scroll)
    : { x: "max-content" as const, ...scroll };
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
    <>
      {header ? <DataTableSectionHeader {...header} /> : null}
      <Table<T>
        className={clsx(styles.dataTable, className)}
        aria-label={tableLabel}
        rowKey={rowKey}
        columns={resolvedColumns}
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
        scroll={resolvedScroll}
        rowSelection={rowSelection}
      />
    </>
  );
}
