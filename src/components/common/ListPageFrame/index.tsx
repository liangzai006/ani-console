import { ResourcePageFrame } from "../ResourcePageFrame";
import { ListToolbar, ToolbarIconButton, ToolbarSearch } from "../ListToolbar";
import { StatusTabs } from "../StatusTabs";
import type { ListPageFrameProps } from "./types";
import styles from "./index.module.css";

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
    <ResourcePageFrame header={header}>
      <section className={styles.contentPanel}>
        {tabs ? <StatusTabs {...tabs} /> : null}
        {toolbar ? (
          <ListToolbar actions={toolbar.actions} filters={toolbarFilters} tools={toolbarTools} />
        ) : null}
        {children}
      </section>
    </ResourcePageFrame>
  );
}

export type { ResourcePageHeaderAction, ResourcePageHeaderConfig } from "../ResourcePageFrame";
export type {
  ListPageFrameProps,
  ListPageRefreshConfig,
  ListPageSearchConfig,
  ListPageTabsConfig,
  ListPageToolbarConfig,
} from "./types";
