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

function getHeaderMinWidth(title: string) {
  const textWidth = Array.from(title).reduce(
    (width, character) =>
      width + ((character.codePointAt(0) ?? 0) <= 0xff ? 9 : 14),
    0,
  );
  return textWidth + 32;
}

export function ListDataTable<T>({
  className,
  emptyIconClassName = "icon-yunzhuji",
  emptyText = "暂无数据",
  preserveTableOnEmpty: _preserveTableOnEmpty,
  scroll = { x: "max-content", y: true },
  ...tableProps
}: ListDataTableProps<T>) {
  const columns = tableProps.columns.map((column) => {
    const fixedColumn =
      column.key === "name"
        ? { ...column, fixed: column.fixed ?? ("left" as const) }
        : column;
    if (typeof column.title !== "string") return fixedColumn;

    const headerMinWidth = getHeaderMinWidth(column.title);

    return {
      ...fixedColumn,
      headerCellStyle: {
        minWidth: headerMinWidth,
        ...column.headerCellStyle,
      },
      bodyCellStyle: {
        minWidth: headerMinWidth,
        ...column.bodyCellStyle,
      },
      onHeaderCell: (currentColumn: typeof column, index: number) => ({
        title: column.title,
        ...column.onHeaderCell?.(currentColumn, index),
      }),
    };
  });
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
      columns={columns}
      className={clsx(styles.listDataTable, className)}
      scroll={scroll}
      noDataElement={noDataElement}
    />
  );
}
