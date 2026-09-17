import type { TableColumnProps, TableProps } from "@arco-design/web-react";

const DEFAULT_COLUMN_WIDTH = 200;
const DEFAULT_NAME_COLUMN_WIDTH = 280;
const DEFAULT_ACTION_COLUMN_WIDTH = 180;
const CELL_HORIZONTAL_PADDING = 32;
const ACTION_BUTTON_HORIZONTAL_PADDING = 8;
const MORE_ICON_WIDTH = 16;

function getTextWidth(text: string) {
  return Array.from(text).reduce(
    (width, character) => width + ((character.codePointAt(0) ?? 0) <= 0xff ? 9 : 14),
    0,
  );
}

function getColumnWidth<T>(column: TableColumnProps<T>) {
  if (typeof column.width === "number") return column.width;
  if (column.key === "name") return DEFAULT_NAME_COLUMN_WIDTH;
  if (column.key === "__actions" || column.key === "actions") return DEFAULT_ACTION_COLUMN_WIDTH;
  return DEFAULT_COLUMN_WIDTH;
}

export function getRowActionsColumnWidth() {
  return MORE_ICON_WIDTH + ACTION_BUTTON_HORIZONTAL_PADDING + CELL_HORIZONTAL_PADDING;
}

export function normalizeDataTableColumns<T>(columns: Array<TableColumnProps<T>>) {
  return columns.map((column) => {
    if (typeof column.title !== "string") return column;
    const headerMinWidth = getTextWidth(column.title) + CELL_HORIZONTAL_PADDING;
    return {
      ...column,
      headerCellStyle: { minWidth: headerMinWidth, ...column.headerCellStyle },
      bodyCellStyle: { minWidth: headerMinWidth, ...column.bodyCellStyle },
      onHeaderCell: (currentColumn: typeof column, index: number) => ({
        title: column.title,
        ...column.onHeaderCell?.(currentColumn, index),
      }),
    };
  });
}

export function resolveDataTableScroll<T>(
  columns: Array<TableColumnProps<T>>,
  scroll: TableProps<T>["scroll"],
) {
  const calculatedScrollX = columns.reduce((width, column) => width + getColumnWidth(column), 0);
  return {
    ...scroll,
    x:
      scroll?.x === false
        ? false
        : typeof scroll?.x === "number"
          ? Math.max(scroll.x, calculatedScrollX)
          : (scroll?.x ?? calculatedScrollX),
  };
}
