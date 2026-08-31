import { forwardRef, type ReactNode } from "react";
import { Button, type ButtonProps } from "@arco-design/web-react";
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
  scroll = { x: "max-content", y: true },
  ...tableProps
}: ListDataTableProps<T>) {
  const noDataElement = (
    <div className={styles.tableState}>
      <i
        className={`iconfont ${emptyIconClassName} ${styles.emptyIcon}`}
        aria-hidden="true"
      />
      <span>{emptyText}</span>
    </div>
  );

  return (
    <DataTable
      {...tableProps}
      className={clsx(styles.listDataTable, className)}
      scroll={scroll}
      noDataElement={noDataElement}
    />
  );
}

export function ListRowActions({ children }: { children: ReactNode }) {
  return <div className={styles.rowActions}>{children}</div>;
}

export function ListNameCell({ name, id }: { name: ReactNode; id: ReactNode }) {
  return (
    <div className={styles.listNameCell}>
      <span className={styles.listName}>{name}</span>
      <span className={styles.listNameId}>{id}</span>
    </div>
  );
}

export const ListRowActionButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & { children: ReactNode }
>(function ListRowActionButton({ children, ...buttonProps }, ref) {
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
