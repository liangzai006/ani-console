import { Button, Empty, Spin } from "@arco-design/web-react";
import {
  IconCheckCircle,
  IconClockCircle,
  IconCloseCircle,
  IconRefresh,
} from "@arco-design/web-react/icon";
import clsx from "clsx";
import type { HomeTask, HomeTaskFilter } from "../types";
import styles from "../index.module.css";

export function TasksPanel({
  items,
  filter,
  loading,
  refreshing,
  onFilterChange,
  onRefresh,
}: {
  items: HomeTask[];
  filter: HomeTaskFilter;
  loading: boolean;
  refreshing: boolean;
  onFilterChange: (filter: HomeTaskFilter) => void;
  onRefresh: () => void;
}) {
  return (
    <section className={clsx(styles.panel, styles.taskPanel)}>
      <header className={styles.panelHeader}>
        <h2>任务中心</h2>
        <Button
          type="text"
          size="mini"
          icon={<IconRefresh />}
          loading={refreshing}
          onClick={onRefresh}
        >
          刷新
        </Button>
      </header>
      <div className={styles.tabBar} role="tablist" aria-label="任务状态">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "done"}
          className={clsx(styles.tabButton, filter === "done" && styles.tabButtonActive)}
          onClick={() => onFilterChange("done")}
        >
          已完成
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "current"}
          className={clsx(styles.tabButton, filter === "current" && styles.tabButtonActive)}
          onClick={() => onFilterChange("current")}
        >
          当前任务
        </button>
      </div>

      <div className={styles.taskList}>
        {loading ? (
          <div className={styles.taskState} role="status">
            <Spin />
            <span>正在加载任务...</span>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.taskState}>
            <Empty description={filter === "current" ? "暂无当前任务" : "暂无已完成任务"} />
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className={styles.taskItem}>
              <span className={clsx(styles.taskIcon, styles[`taskIcon_${item.status}`])}>
                {item.status === "done" ? <IconCheckCircle /> : null}
                {item.status === "failed" ? <IconCloseCircle /> : null}
                {item.status === "current" ? <IconClockCircle /> : null}
              </span>
              <span className={styles.taskText}>
                <span className={styles.taskName}>{item.title}</span>
                <span className={styles.mutedText}>{item.subtitle}</span>
              </span>
              {item.status === "current" ? (
                <span className={styles.taskProgress} aria-label={`进度 ${item.progress ?? 0}%`}>
                  <span style={{ width: `${item.progress ?? 0}%` }} />
                </span>
              ) : (
                <span className={styles.taskTime}>{item.time}</span>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
