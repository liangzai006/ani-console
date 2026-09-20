import { Space, Tooltip } from "@arco-design/web-react";
import clsx from "clsx";
import { ToolbarButton } from "../ListToolbar";
import type {
  ResourcePageFrameProps,
  ResourcePageHeaderAction,
  ResourcePageHeaderConfig,
} from "./types";
import styles from "./index.module.css";

function ResourcePageTitle({
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

function ResourcePageHeaderActionButton({ action }: { action: ResourcePageHeaderAction }) {
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

function ResourcePageHeader({
  iconClassName,
  title,
  subtitle,
  actions,
  extra,
}: ResourcePageHeaderConfig) {
  const actionArea = actions?.length ? (
    <Space size={8}>
      {actions.map((action) => (
        <ResourcePageHeaderActionButton key={action.key} action={action} />
      ))}
    </Space>
  ) : (
    extra
  );

  return (
    <header className={styles.pageHeader}>
      <ResourcePageTitle iconClassName={iconClassName} title={title} subtitle={subtitle} />
      {actionArea ? <div className={styles.pageHeaderExtra}>{actionArea}</div> : null}
    </header>
  );
}

export function ResourcePageFrame({ header, children }: ResourcePageFrameProps) {
  return (
    <div className={styles.page}>
      <ResourcePageHeader {...header} />
      {children}
    </div>
  );
}

export type {
  ResourcePageFrameProps,
  ResourcePageHeaderAction,
  ResourcePageHeaderConfig,
} from "./types";
