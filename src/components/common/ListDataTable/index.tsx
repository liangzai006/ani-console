import clsx from "clsx";
import { DataTable, type DataTableProps } from "../DataTable";
import styles from "./index.module.css";

export type ListDataTableProps<T> = Omit<DataTableProps<T>, "className" | "noDataElement"> & {
  className?: string;
  emptyIconClassName?: string;
  emptyText?: string;
  preserveTableOnEmpty?: boolean;
};

const DEFAULT_NAME_COLUMN_WIDTH = 280;

export function ListDataTable<T>({
  className,
  emptyIconClassName = "icon-yunzhuji",
  emptyText = "暂无数据",
  preserveTableOnEmpty: _preserveTableOnEmpty,
  scroll,
  ...tableProps
}: ListDataTableProps<T>) {
  const columns = tableProps.columns.map((column) => {
    const fixedColumn =
      column.key === "name"
        ? {
            ...column,
            fixed: column.fixed ?? ("left" as const),
            width: column.width ?? DEFAULT_NAME_COLUMN_WIDTH,
          }
        : column;
    return fixedColumn;
  });
  const noDataElement = (
    <div className={styles.tableState}>
      <i className={clsx("iconfont", emptyIconClassName, styles.emptyIcon)} aria-hidden="true" />
      <span>{emptyText}</span>
    </div>
  );

  return (
    <DataTable
      {...tableProps}
      columns={columns}
      className={clsx(styles.listDataTable, className)}
      scroll={{ ...scroll, y: scroll?.y ?? true }}
      noDataElement={noDataElement}
    />
  );
}
