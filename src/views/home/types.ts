export type HomeTimeRange = "1d" | "7d" | "30d";
export type HomeTaskStatus = "done" | "failed" | "current";
export type HomeTaskFilter = "done" | "current";
export type HomeMonitorSource = "external" | "internal";

export type HomeRoute =
  | "/instances/vm"
  | "/instances/vm/create"
  | "/instances/container"
  | "/instances/container/create"
  | "/gpu-instances"
  | "/instances/sandbox/create"
  | "/k8s-clusters"
  | "/volumes"
  | "/networks/vpcs"
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

export type HomeTrendData = {
  title: string;
  yMax: number;
  yInterval: number;
  ranges: Record<HomeTimeRange, HomeTrendSnapshot>;
};

export type HomeTask = {
  id: string;
  title: string;
  subtitle: string;
  time?: string;
  status: HomeTaskStatus;
  progress?: number;
};

export type HomeCpuItem = {
  id: string;
  instanceId: string;
  name: string;
  value: number;
};

export type HomeOverviewData = {
  user: {
    username: string;
    avatarText: string;
    greeting: string;
  };
  summaries: HomeSummaryCard[];
  recentItems: HomeShortcut[];
  quickCreateItems: HomeShortcut[];
  primaryTrend: HomeTrendData;
  comparisonTrend: HomeTrendData;
  percentageTrend: HomeTrendData;
  tasks: HomeTask[];
  cpu: Record<HomeMonitorSource, HomeCpuItem[]>;
};

export interface HomeOverviewDataSource {
  getOverview(): Promise<HomeOverviewData>;
}
