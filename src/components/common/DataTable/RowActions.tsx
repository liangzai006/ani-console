import clsx from "clsx";
import { forwardRef, type ReactNode } from "react";
import { Button, Dropdown, Menu, Tooltip, type ButtonProps } from "@arco-design/web-react";
import { IconDown } from "@arco-design/web-react/icon";
import type { RowAction, RowActionIntent } from "./types";
import styles from "./index.module.css";

const MORE_LABEL = "更多";

export function DataTableRowActions({ children }: { children: ReactNode }) {
  return <div className={styles.rowActions}>{children}</div>;
}

export const DataTableRowActionButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & { children: ReactNode }
>(function DataTableRowActionButton({ children, ...buttonProps }, ref) {
  return (
    <Button ref={ref} type="text" size="small" {...buttonProps} className={styles.rowActionButton}>
      {children}
    </Button>
  );
});

function resolveActionValue<T, V>(value: V | ((record: T) => V), record: T): V {
  return typeof value === "function" ? (value as (current: T) => V)(record) : value;
}

function getActionStatus(intent: RowActionIntent | undefined): ButtonProps["status"] {
  return intent && intent !== "default" ? intent : undefined;
}

function getMenuItemClassName(intent: RowActionIntent | undefined) {
  return clsx({
    [styles.menuItemDanger]: intent === "danger",
    [styles.menuItemWarning]: intent === "warning",
    [styles.menuItemSuccess]: intent === "success",
  });
}

function renderActionLabel<T>(action: RowAction<T>, record: T) {
  return resolveActionValue(action.label, record);
}

function renderTooltip<T>(action: RowAction<T>, record: T, node: ReactNode) {
  const content = action.tooltip ? resolveActionValue(action.tooltip, record) : undefined;
  return content ? (
    <Tooltip content={content}>
      <span className={styles.actionTooltipTrigger}>{node}</span>
    </Tooltip>
  ) : (
    node
  );
}

export function ConfiguredDataTableRowActions<T>({
  actions,
  record,
}: {
  actions: Array<RowAction<T>>;
  record: T;
}) {
  const [configuredPrimary, ...configuredSecondary] = actions;
  const primary = configuredPrimary?.visible?.(record) === false ? undefined : configuredPrimary;
  const secondary = configuredSecondary.filter((action) => action.visible?.(record) !== false);
  const menu = secondary.length ? (
    <Menu
      className={styles.semanticMenu}
      onClickMenuItem={(key) => {
        const action = secondary.find((item) => item.key === key);
        if (action) void action.onClick(record);
      }}
    >
      {secondary.map((action) => (
        <Menu.Item
          key={action.key}
          disabled={action.disabled?.(record) || action.loading?.(record)}
          className={getMenuItemClassName(action.intent)}
        >
          {renderTooltip(action, record, renderActionLabel(action, record))}
        </Menu.Item>
      ))}
    </Menu>
  ) : null;

  if (!primary && !menu) return "-";

  return (
    <DataTableRowActions>
      {primary
        ? renderTooltip(
            primary,
            record,
            <DataTableRowActionButton
              status={getActionStatus(primary.intent)}
              disabled={primary.disabled?.(record)}
              loading={primary.loading?.(record)}
              onClick={() => void primary.onClick(record)}
            >
              {renderActionLabel(primary, record)}
            </DataTableRowActionButton>,
          )
        : null}
      {menu ? (
        <Dropdown droplist={menu} trigger="click" position="br">
          <DataTableRowActionButton>
            {MORE_LABEL}
            <IconDown />
          </DataTableRowActionButton>
        </Dropdown>
      ) : null}
    </DataTableRowActions>
  );
}
