import { Button, Tooltip } from "@arco-design/web-react";
import clsx from "clsx";
import { useState, type CSSProperties, type ReactNode } from "react";
import { AliIcon } from "../AliIcon";
import { DetailBreadcrumbs } from "./DetailBreadcrumbs";
import { DetailContentTabs } from "./DetailContentTabs";
import { DetailInfoSidebar } from "./DetailInfoSidebar";
import { DetailPageHeader } from "./DetailPageHeader";
import styles from "./index.module.css";
import type { DetailBreadcrumbItem, DetailCard, DetailHeaderItems, DetailTab } from "./types";

type DetailPageFrameProps = {
  breadcrumbs: DetailBreadcrumbItem[];
  title: ReactNode;
  status?: ReactNode;
  icon?: ReactNode;
  headerItems: DetailHeaderItems;
  actions?: ReactNode;
  cards: DetailCard[];
  tabs?: DetailTab[];
  onBack?: () => void;
  leftWidth?: number;
  defaultTabKey?: string;
  activeTabKey?: string;
  onTabChange?: (key: string) => void;
};

export function DetailPageFrame({
  breadcrumbs,
  title,
  status,
  icon,
  headerItems,
  actions,
  cards,
  tabs,
  onBack,
  leftWidth = 320,
  defaultTabKey,
  activeTabKey,
  onTabChange,
}: DetailPageFrameProps) {
  const hasTabs = Boolean(tabs?.length);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const workspaceStyle = { ["--detail-left-width" as string]: `${leftWidth}px` } as CSSProperties;

  return (
    <div className={styles.page}>
      <DetailBreadcrumbs items={breadcrumbs} onBack={onBack} />
      <DetailPageHeader
        title={title}
        status={status}
        icon={icon}
        items={headerItems}
        actions={actions}
      />

      <div
        className={clsx(
          styles.workspace,
          hasTabs ? styles.workspaceSplit : styles.workspaceSingle,
          leftCollapsed && styles.workspaceCollapsed,
        )}
        style={workspaceStyle}
      >
        <DetailInfoSidebar cards={cards} collapsed={leftCollapsed} />

        {hasTabs ? (
          <Tooltip content={leftCollapsed ? "展开详情栏" : "收起详情栏"}>
            <Button
              type="text"
              shape="circle"
              className={styles.paneToggle}
              aria-label={leftCollapsed ? "展开详情栏" : "收起详情栏"}
              onClick={() => setLeftCollapsed((current) => !current)}
            >
              <AliIcon name="left-chevron" size={16} className={styles.paneToggleIcon} />
            </Button>
          </Tooltip>
        ) : null}

        {hasTabs ? (
          <DetailContentTabs
            tabs={tabs ?? []}
            defaultTabKey={defaultTabKey}
            activeTabKey={activeTabKey}
            onTabChange={onTabChange}
          />
        ) : null}
      </div>
    </div>
  );
}
