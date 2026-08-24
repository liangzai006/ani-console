import { Spin } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { SummaryOverview } from "./components/SummaryOverview";
import { TasksPanel } from "./components/TasksPanel";
import { TopCpuPanel } from "./components/TopCpuPanel";
import { TrendCard } from "./components/TrendCard";
import { WelcomePanel } from "./components/WelcomePanel";
import { homeOverviewDataSource } from "./data-source";
import type { HomeOverviewDataSource } from "./types";
import styles from "./home.module.css";

export function HomePage({
  dataSource = homeOverviewDataSource,
}: {
  dataSource?: HomeOverviewDataSource;
}) {
  const query = useQuery({
    queryKey: ["home-overview"],
    queryFn: () => dataSource.getOverview(),
  });

  if (query.isLoading) {
    return (
      <div className={styles.pageState} role="status">
        <Spin size={32} />
        <span>正在加载首页数据...</span>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className={styles.pageState} role="alert">
        <strong>首页数据加载失败</strong>
        <button type="button" onClick={() => void query.refetch()}>
          重新加载
        </button>
      </div>
    );
  }

  const data = query.data;
  return (
    <main className={styles.homePage} data-testid="home-overview-page">
      <div className={styles.twoColumnRow} data-testid="home-top-row">
        <SummaryOverview items={data.summaries} />
        <WelcomePanel
          user={data.user}
          quickCreateItems={data.quickCreateItems}
          recentItems={data.recentItems}
        />
      </div>

      <div className={styles.twoColumnRow} data-testid="home-middle-row">
        <TrendCard data={data.primaryTrend} testId="primary" />
        <TrendCard data={data.percentageTrend} testId="percentage" />
      </div>

      <div className={styles.bottomGrid} data-testid="home-bottom-grid">
        <TrendCard data={data.comparisonTrend} testId="comparison" />
        <TasksPanel items={data.tasks} />
        <TopCpuPanel data={data.cpu} />
      </div>
    </main>
  );
}
