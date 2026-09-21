import { useState } from "react";
import { InstanceEvents } from "@/components/instances/InstanceEvents";
import { SandboxSecurityEvents } from "../SandboxSecurityEvents";
import styles from "./index.module.css";

type EventTab = "all" | "security";

export function SandboxEvents({ instanceId }: { instanceId: string }) {
  const [activeTab, setActiveTab] = useState<EventTab>("all");

  return (
    <div>
      <div className={styles.tabList} role="tablist" aria-label="事件类型">
        {[
          { key: "all" as const, label: "全部" },
          { key: "security" as const, label: "安全" },
        ].map((item) => {
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              className={active ? styles.activeTab : styles.tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className={styles.content} role="tabpanel">
        {activeTab === "all" ? (
          <InstanceEvents instanceId={instanceId} />
        ) : (
          <SandboxSecurityEvents instanceId={instanceId} />
        )}
      </div>
    </div>
  );
}
