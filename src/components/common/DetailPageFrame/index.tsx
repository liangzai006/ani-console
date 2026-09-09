import { Breadcrumb, Button, Tabs, Tooltip } from "@arco-design/web-react";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AliIcon } from "../AliIcon";
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

function buildInitialCollapsed(cardsSignature: string) {
  const cardEntries = JSON.parse(cardsSignature) as Array<[string, boolean]>;
  const initial = Object.fromEntries(cardEntries) as Record<string, boolean>;
  const visibleCount = Object.values(initial).filter((value) => !value).length;
  if (visibleCount > 0) return initial;
  const [firstCard] = cardEntries;
  return firstCard ? { ...initial, [firstCard[0]]: false } : initial;
}

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
  leftWidth = 452,
  defaultTabKey,
  activeTabKey: controlledActiveTabKey,
  onTabChange,
}: DetailPageFrameProps) {
  const visibleBreadcrumbs = breadcrumbs.filter((item) => item.to !== "/");
  const hasTabs = Boolean(tabs?.length);
  const cardsSignature = JSON.stringify(
    cards.map((card) => [card.key, Boolean(card.defaultCollapsed)]),
  );
  const initialCollapsed = useMemo(() => buildInitialCollapsed(cardsSignature), [cardsSignature]);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>(initialCollapsed);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [internalActiveTabKey, setInternalActiveTabKey] = useState(
    defaultTabKey ?? tabs?.[0]?.key ?? "",
  );
  const activeTabKey = controlledActiveTabKey ?? internalActiveTabKey;

  useEffect(() => {
    setCollapsedCards(initialCollapsed);
  }, [initialCollapsed]);

  useEffect(() => {
    if (!tabs?.length) return;
    if (!tabs.some((tab) => tab.key === activeTabKey)) {
      setInternalActiveTabKey(defaultTabKey ?? tabs[0].key);
    }
  }, [activeTabKey, defaultTabKey, tabs]);

  const activeTab = tabs?.find((tab) => tab.key === activeTabKey) ?? tabs?.[0];
  const expandedCardCount = cards.reduce(
    (count, card) => count + (collapsedCards[card.key] ? 0 : 1),
    0,
  );

  const toggleCard = (key: string) => {
    setCollapsedCards((current) => {
      const isCollapsed = Boolean(current[key]);
      const visibleCount = cards.reduce((count, card) => count + (current[card.key] ? 0 : 1), 0);
      if (!isCollapsed && visibleCount <= 1) return current;
      return { ...current, [key]: !isCollapsed };
    });
  };

  const workspaceStyle = { ["--detail-left-width" as string]: `${leftWidth}px` } as CSSProperties;

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumbRow}>
        <Tooltip content="返回上一级">
          <Button
            type="text"
            shape="circle"
            className={styles.backButton}
            aria-label="返回上一级"
            onClick={onBack ?? (() => window.history.back())}
          >
            <AliIcon name="left-arrow" size={16} />
          </Button>
        </Tooltip>
        <Breadcrumb className={styles.breadcrumbs} aria-label="详情面包屑">
          {visibleBreadcrumbs.map((item, index) => {
            const isLast = index === visibleBreadcrumbs.length - 1;
            return (
              <Breadcrumb.Item key={`${index}-${String(item.label)}`}>
                {item.to && !isLast ? (
                  <Link
                    to={item.to as any}
                    params={item.params as any}
                    className={styles.breadcrumbLink}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? styles.breadcrumbCurrent : styles.breadcrumbText}>
                    {item.label}
                  </span>
                )}
              </Breadcrumb.Item>
            );
          })}
        </Breadcrumb>
      </div>

      <section className={styles.headerCard} data-testid="detail-header">
        <div className={styles.identity}>
          {icon ? <div className={styles.identityIcon}>{icon}</div> : null}
          <div className={styles.identityText}>
            <h1 className={styles.title}>{title}</h1>
            {status ? <div className={styles.status}>{status}</div> : null}
          </div>
        </div>

        <div className={styles.headerItems} aria-label="关键字段">
          {headerItems.map((item, index) => (
            <div key={`${index}-${String(item.label)}`} className={styles.headerItem}>
              <span className={styles.headerItemLabel}>{item.label}</span>
              <span className={styles.headerItemValue}>{item.value ?? "-"}</span>
            </div>
          ))}
        </div>

        {actions ? <div className={styles.headerActions}>{actions}</div> : null}
      </section>

      <div
        className={clsx(
          styles.workspace,
          hasTabs ? styles.workspaceSplit : styles.workspaceSingle,
          leftCollapsed && styles.workspaceCollapsed,
        )}
        style={workspaceStyle}
        data-testid="detail-workspace"
        data-left-collapsed={leftCollapsed}
      >
        <aside
          className={clsx(styles.leftPane, leftCollapsed && styles.leftPaneCollapsed)}
          aria-label="详情信息"
          data-testid="detail-left-pane"
        >
          <div className={styles.cardStack}>
            {cards.map((card) => {
              const isCollapsed = Boolean(collapsedCards[card.key]);
              const bodyId = `detail-card-${card.key}`;
              return (
                <section
                  key={card.key}
                  className={clsx(
                    styles.card,
                    !isCollapsed && expandedCardCount === 1 && styles.cardFill,
                  )}
                >
                  <button
                    type="button"
                    className={styles.cardHeader}
                    aria-expanded={!isCollapsed}
                    aria-controls={bodyId}
                    aria-label={`${isCollapsed ? "展开" : "折叠"}${String(card.title)}`}
                    onClick={() => toggleCard(card.key)}
                  >
                    <span className={styles.cardAccent} />
                    <AliIcon
                      name="down-chevron-small"
                      size={14}
                      className={isCollapsed ? styles.cardChevronCollapsed : styles.cardChevron}
                    />
                    <span className={styles.cardTitle}>{card.title}</span>
                  </button>
                  {!isCollapsed ? (
                    <div id={bodyId} className={styles.cardBody}>
                      {card.fields.map((field, index) => (
                        <div key={`${card.key}-${index}`} className={styles.fieldRow}>
                          <div className={styles.fieldLabel}>{field.label}</div>
                          <div className={clsx(styles.fieldValue, field.valueClassName)}>
                            {field.value ?? "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </aside>

        {hasTabs ? (
          <Tooltip content={leftCollapsed ? "展开详情栏" : "收起详情栏"}>
            <Button
              type="text"
              shape="circle"
              className={styles.paneToggle}
              aria-label={leftCollapsed ? "展开详情栏" : "收起详情栏"}
              onClick={() => setLeftCollapsed((current) => !current)}
            >
              <AliIcon name="left-chevron" size={16} />
            </Button>
          </Tooltip>
        ) : null}

        {hasTabs ? (
          <section className={styles.rightPane} data-testid="detail-right-pane">
            <Tabs
              className={styles.tabs}
              type="line"
              headerPadding={false}
              inkBarSize={{ width: 16 }}
              activeTab={activeTab?.key}
              onChange={(key) => {
                if (controlledActiveTabKey === undefined) setInternalActiveTabKey(key);
                onTabChange?.(key);
              }}
              extra={activeTab?.extra}
              overflow="scroll"
              scrollPosition="auto"
              destroyOnHide
              justify
            >
              {tabs?.map((tab) => (
                <Tabs.TabPane key={tab.key} title={tab.label}>
                  {tab.content}
                </Tabs.TabPane>
              ))}
            </Tabs>
          </section>
        ) : null}
      </div>
    </div>
  );
}
