import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SummaryOverview } from "./SummaryOverview";
import { TasksPanel } from "./TasksPanel";
import { TrendCard } from "./TrendCard";
import { WelcomePanel } from "./WelcomePanel";
import {
  homeOverviewDataSource,
  homeQuickCreateItems,
  homeSummaryPlaceholders,
  homeTrendConfigs,
} from "./data-source";
import type { HomeOverviewDataSource, HomeTaskFilter } from "./types";
import styles from "./index.module.css";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";

export function OverviewPage({
  dataSource = homeOverviewDataSource,
}: {
  dataSource?: HomeOverviewDataSource;
}) {
  const [taskFilter, setTaskFilter] = useState<HomeTaskFilter>("done");
  const summariesQuery = useQuery({
    queryKey: ["home-overview-summaries"],
    queryFn: () => dataSource.getSummaries(),
    retry: 1,
    refetchInterval: 30_000,
  });
  const tasksQuery = useQuery({
    queryKey: ["home-tasks", taskFilter],
    queryFn: () => dataSource.getTasks(taskFilter),
    retry: 1,
    refetchInterval: 5_000,
  });
  useListErrorNotification({
    id: "home-overview-summaries",
    title: "概览统计加载失败",
    error: summariesQuery.error,
  });
  useListErrorNotification({
    id: "home-tasks",
    title: "任务中心加载失败",
    error: tasksQuery.error,
  });

  return (
    <main className={styles.homePage}>
      <div className={styles.twoColumnRow}>
        <SummaryOverview items={summariesQuery.data ?? homeSummaryPlaceholders} />
        <WelcomePanel quickCreateItems={homeQuickCreateItems} />
      </div>

      <div className={styles.twoColumnRow}>
        <TrendCard config={homeTrendConfigs.gpu} dataSource={dataSource} metric="gpu" />
        <TrendCard config={homeTrendConfigs.cpu} dataSource={dataSource} metric="cpu" />
      </div>

      <div className={styles.bottomGrid}>
        <TrendCard config={homeTrendConfigs.memory} dataSource={dataSource} metric="memory" />
        <TasksPanel
          items={tasksQuery.data ?? []}
          filter={taskFilter}
          loading={tasksQuery.isLoading}
          refreshing={tasksQuery.isFetching && !tasksQuery.isLoading}
          onFilterChange={setTaskFilter}
          onRefresh={() => tasksQuery.refetch()}
        />
      </div>
    </main>
  );
}
