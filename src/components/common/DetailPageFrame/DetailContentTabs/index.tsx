import { Tabs } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import styles from "./index.module.css";
import type { DetailTab } from "../types";

type DetailContentTabsProps = {
  tabs: DetailTab[];
  defaultTabKey?: string;
  activeTabKey?: string;
  onTabChange?: (key: string) => void;
};

export function DetailContentTabs({
  tabs,
  defaultTabKey,
  activeTabKey: controlledActiveTabKey,
  onTabChange,
}: DetailContentTabsProps) {
  const [internalActiveTabKey, setInternalActiveTabKey] = useState(
    defaultTabKey ?? tabs[0]?.key ?? "",
  );
  const activeTabKey = controlledActiveTabKey ?? internalActiveTabKey;

  useEffect(() => {
    if (!tabs.length) return;
    if (!tabs.some((tab) => tab.key === activeTabKey)) {
      setInternalActiveTabKey(defaultTabKey ?? tabs[0].key);
    }
  }, [activeTabKey, defaultTabKey, tabs]);

  const activeTab = tabs.find((tab) => tab.key === activeTabKey) ?? tabs[0];

  return (
    <section className={styles.rightPane}>
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
        {tabs.map((tab) => (
          <Tabs.TabPane key={tab.key} title={tab.label}>
            {tab.content}
          </Tabs.TabPane>
        ))}
      </Tabs>
    </section>
  );
}
