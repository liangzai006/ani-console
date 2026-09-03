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

const DEFAULT_COLUMN_WIDTH = 160;
const DEFAULT_NAME_COLUMN_WIDTH = 280;
const DEFAULT_ACTION_COLUMN_WIDTH = 180;

function getHeaderMinWidth(title: string) {
  const textWidth = Array.from(title).reduce(
    (width, character) =>
      width + ((character.codePointAt(0) ?? 0) <= 0xff ? 9 : 14),
    0,
  );
  return textWidth + 32;
}

function getDefaultColumnWidth<T>(
  column: DataTableProps<T>["columns"][number],
) {
  if (typeof column.width === "number") return column.width;
  if (column.key === "name") return DEFAULT_NAME_COLUMN_WIDTH;
  if (column.key === "__actions") return DEFAULT_ACTION_COLUMN_WIDTH;
  return DEFAULT_COLUMN_WIDTH;
}

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
        : column.key === "__actions" && column.fixed
          ? {
              ...column,
              width: column.width ?? DEFAULT_ACTION_COLUMN_WIDTH,
            }
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
  const tableScroll = scroll ?? {
    x: columns.reduce(
      (width, column) => width + getDefaultColumnWidth(column),
      0,
    ),
    y: true,
  };
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
      scroll={tableScroll}
      noDataElement={noDataElement}
    />
  );
}
