export type HomeTimeRange = "1d" | "7d" | "30d";
export type HomeResourceTrendMetric = "gpu" | "cpu" | "memory";
export type HomeTaskStatus = "done" | "failed" | "current";
export type HomeTaskFilter = "done" | "current";
export type HomeRoute =
  | "/overview-compute"
  | "/vm-instances"
  | "/container-instances"
  | "/gpu-instances"
  | "/sandbox-instances"
  | "/k8s-clusters"
  | "/volumes"
  | "/vpcs"
  | "/models"
  | "/inference"
  | "/kb"
  | "/registry"
  | "/vector-stores";

export type HomeSummaryStatus = {
  label: string;
  value: number;
  tone: "success" | "danger" | "neutral";
};

export type HomeSummaryCard = {
  id: string;
  label: string;
  value: number;
  icon: string;
  route: HomeRoute;
  statuses: HomeSummaryStatus[];
};

export type HomeShortcut = {
  id: string;
  name: string;
  icon: string;
  route: HomeRoute;
};

export type HomeTrendSeries = {
  name: string;
  color: string;
  values: number[];
};

export type HomeTrendHeadline = {
  label: string;
  value: number;
  unit: string;
  color: string;
};

export type HomeTrendSnapshot = {
  labels: string[];
  headlines: HomeTrendHeadline[];
  series: HomeTrendSeries[];
};

export type HomeTrendConfig = {
  title: string;
  yMax: number;
  yInterval: number;
};

export type HomeTask = {
  id: string;
  title: string;
  subtitle: string;
  time?: string;
  status: HomeTaskStatus;
  progress?: number;
};

export interface HomeOverviewDataSource {
  getSummaries(): Promise<HomeSummaryCard[]>;
  getTasks(filter: HomeTaskFilter): Promise<HomeTask[]>;
  getResourceTrend(
    metric: HomeResourceTrendMetric,
    range: HomeTimeRange,
  ): Promise<HomeTrendSnapshot>;
}
