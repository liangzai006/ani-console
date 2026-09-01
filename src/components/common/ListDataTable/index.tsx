import clsx from "clsx";
import { DataTable, type DataTableProps } from "../DataTable";
import styles from "./index.module.css";

export type ListDataTableProps<T> = Omit<
  DataTableProps<T>,
  "className" | "noDataElement"
> & {
  className?: string;
  emptyIconClassName?: string;
  emptyText?: string;
  preserveTableOnEmpty?: boolean;
};

export function ListDataTable<T>({
  className,
  emptyIconClassName = "icon-yunzhuji",
  emptyText = "暂无数据",
  preserveTableOnEmpty: _preserveTableOnEmpty,
  ...tableProps
}: ListDataTableProps<T>) {
  const noDataElement = (
    <div className={styles.tableState}>
      <i
        className={clsx("iconfont", emptyIconClassName, styles.emptyIcon)}
        aria-hidden="true"
      />
      <span>{emptyText}</span>
    </div>
  );

  return (
    <DataTable
      {...tableProps}
      className={clsx(styles.listDataTable, className)}
      noDataElement={noDataElement}
    />
  );
}
