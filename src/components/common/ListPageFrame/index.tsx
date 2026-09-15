import { Space, Tooltip } from "@arco-design/web-react";
import clsx from "clsx";
import { ListToolbar, ToolbarButton, ToolbarIconButton, ToolbarSearch } from "../ListToolbar";
import { StatusTabs } from "../StatusTabs";
import type { ListPageFrameProps, ListPageHeaderAction, ListPageHeaderConfig } from "./types";
import styles from "./index.module.css";

function ListPageTitle({
  iconClassName,
  title,
  subtitle,
}: {
  iconClassName: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      <div className={styles.pageHeaderIcon} aria-hidden="true">
        <i className={clsx("iconfont", iconClassName)} />
      </div>
      <div className={styles.pageHeaderTitleArea}>
        <h1 className={styles.pageHeaderTitle}>{title}</h1>
        {subtitle ? <p className={styles.pageHeaderSubtitle}>{subtitle}</p> : null}
      </div>
    </>
  );
}

function HeaderAction({ action }: { action: ListPageHeaderAction }) {
  const button = (
    <ToolbarButton
      {...action.buttonProps}
      iconClassName={action.iconClassName}
      variant={action.variant}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {action.label}
    </ToolbarButton>
  );

  if (!action.tooltip) return button;

  return (
    <Tooltip content={action.tooltip}>
      <span>{button}</span>
    </Tooltip>
  );
}

function ListPageHeader({ iconClassName, title, subtitle, actions, extra }: ListPageHeaderConfig) {
  const actionArea = actions?.length ? (
    <Space size={8}>
      {actions.map((action) => (
        <HeaderAction key={action.key} action={action} />
      ))}
    </Space>
  ) : (
    extra
  );

  return (
    <header className={styles.pageHeader}>
      <ListPageTitle iconClassName={iconClassName} title={title} subtitle={subtitle} />
      {actionArea ? <div className={styles.pageHeaderExtra}>{actionArea}</div> : null}
    </header>
  );
}

export function ListPageFrame<
  TStatus extends string = string,
  TSearchField extends string = string,
>({ header, tabs, toolbar, children }: ListPageFrameProps<TStatus, TSearchField>) {
  const toolbarFilters =
    toolbar?.search || toolbar?.filters ? (
      <>
        {toolbar.search ? <ToolbarSearch {...toolbar.search} /> : null}
        {toolbar.filters}
      </>
    ) : undefined;
  const toolbarTools =
    toolbar?.tools || toolbar?.refresh ? (
      <>
        {toolbar.tools}
        {toolbar.refresh ? (
          <ToolbarIconButton
            iconClassName="icon-refresh-1"
            label={toolbar.refresh.label ?? "刷新"}
            spinning={toolbar.refresh.spinning}
            disabled={toolbar.refresh.disabled}
            onClick={toolbar.refresh.onClick}
          />
        ) : null}
      </>
    ) : undefined;

  return (
    <div className={styles.page}>
      <ListPageHeader {...header} />
      <section className={styles.contentPanel}>
        {tabs ? <StatusTabs {...tabs} /> : null}
        {toolbar ? (
          <ListToolbar actions={toolbar.actions} filters={toolbarFilters} tools={toolbarTools} />
        ) : null}
        {children}
      </section>
    </div>
  );
}

export type {
  ListPageFrameProps,
  ListPageHeaderAction,
  ListPageHeaderConfig,
  ListPageRefreshConfig,
  ListPageSearchConfig,
  ListPageTabsConfig,
  ListPageToolbarConfig,
} from "./types";
