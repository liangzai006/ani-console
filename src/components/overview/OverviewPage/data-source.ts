import { queryResourceTrend } from "@/api/observability";
import { getConsoleOverview, type ConsoleOverviewStatistics } from "@/api/overview";
import { getTask, listTasks, type AsyncTask, type AsyncTaskStatus } from "@/api/tasks";
import {
  formatDateTime,
  formatTrendTime,
  getPreviousHoursDateTimeRange,
  isValidDateTime,
} from "@/lib/date";
import type {
  HomeOverviewDataSource,
  HomeResourceTrendMetric,
  HomeShortcut,
  HomeSummaryCard,
  HomeTask,
  HomeTaskFilter,
  HomeTimeRange,
  HomeTrendConfig,
  HomeTrendHeadline,
  HomeTrendSnapshot,
} from "./types";

const BLUE = "#0079D3";
const HOME_TASK_LIMIT = 10;

const taskStatusByFilter: Record<HomeTaskFilter, AsyncTaskStatus> = {
  done: "completed",
  current: "running",
};

const taskStatusLabels: Record<AsyncTask["status"], string> = {
  pending: "等待中",
  running: "进行中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
  dead_letter: "处理失败",
};

export const homeSummaryPlaceholders: HomeSummaryCard[] = [
  {
    id: "instances",
    label: "实例总数",
    value: 0,
    icon: "yunzhuji",
    route: "/overview-compute",
    statuses: [
      { label: "运行中", value: 0, tone: "success" },
      { label: "异常", value: 0, tone: "danger" },
      { label: "其他", value: 0, tone: "neutral" },
    ],
  },
  {
    id: "inference-services",
    label: "推理服务",
    value: 0,
    icon: "tuili",
    route: "/inference",
    statuses: [
      { label: "运行中", value: 0, tone: "success" },
      { label: "异常", value: 0, tone: "danger" },
      { label: "其他", value: 0, tone: "neutral" },
    ],
  },
  {
    id: "models",
    label: "模型仓库",
    value: 0,
    icon: "moxing",
    route: "/models",
    statuses: [
      { label: "可用", value: 0, tone: "success" },
      { label: "失败", value: 0, tone: "danger" },
      { label: "其他", value: 0, tone: "neutral" },
    ],
  },
  {
    id: "knowledge-bases",
    label: "知识库",
    value: 0,
    icon: "zhishiku",
    route: "/kb",
    statuses: [
      { label: "活跃", value: 0, tone: "success" },
      { label: "其他", value: 0, tone: "neutral" },
    ],
  },
];

export const homeQuickCreateItems: HomeShortcut[] = [
  { id: "create-vm", name: "创建云主机", icon: "yunzhuji", route: "/vm-instances" },
  {
    id: "create-container",
    name: "创建容器实例",
    icon: "rongqishili",
    route: "/container-instances",
  },
  {
    id: "create-gpu",
    name: "创建 GPU 容器",
    icon: "GPUrongqishili",
    route: "/gpu-instances",
  },
  {
    id: "create-sandbox",
    name: "创建 Sandbox",
    icon: "Sandbox",
    route: "/sandbox-instances",
  },
  {
    id: "create-k8s",
    name: "创建 K8s 集群",
    icon: "jiqun",
    route: "/k8s-clusters",
  },
];

export const homeTrendConfigs: Record<HomeResourceTrendMetric, HomeTrendConfig> = {
  gpu: { title: "GPU资源趋势", yMax: 100, yInterval: 20 },
  cpu: { title: "CPU资源趋势", yMax: 100, yInterval: 20 },
  memory: { title: "内存资源趋势", yMax: 100, yInterval: 20 },
};

const taskDomainLabels: Record<string, string> = {
  instance: "实例",
  platform_workload: "工作负载",
  volume: "云盘",
  vector_store: "向量存储",
  kb: "知识库文档",
  sandbox: "Sandbox",
};

const taskActionLabels: Record<string, string> = {
  create: "创建",
  start: "启动",
  stop: "停止",
  restart: "重启",
  delete: "删除",
  scale: "扩缩容",
  expand: "扩容",
  rebuild: "重建",
  parse: "解析",
  import: "导入",
};

function getOtherCount(total: number, ...displayedCounts: number[]): number {
  return total - displayedCounts.reduce((sum, count) => sum + count, 0);
}

function toHomeSummaries(overview: ConsoleOverviewStatistics): HomeSummaryCard[] {
  const instanceRunning = overview.instances.by_state.running;
  const instanceFailed = overview.instances.by_state.failed;
  const inferenceRunning = overview.inference_services.by_status.running;
  const inferenceFailed = overview.inference_services.by_status.failed;
  const modelReady = overview.models.by_status.ready;
  const modelFailed = overview.models.by_status.error;
  const knowledgeBaseActive = overview.knowledge_bases.by_status.active;

  return [
    {
      id: "instances",
      label: "实例总数",
      value: overview.instances.total,
      icon: "yunzhuji",
      route: "/overview-compute",
      statuses: [
        { label: "运行中", value: instanceRunning, tone: "success" },
        { label: "异常", value: instanceFailed, tone: "danger" },
        {
          label: "其他",
          value: getOtherCount(overview.instances.total, instanceRunning, instanceFailed),
          tone: "neutral",
        },
      ],
    },
    {
      id: "inference-services",
      label: "推理服务",
      value: overview.inference_services.total,
      icon: "tuili",
      route: "/inference",
      statuses: [
        { label: "运行中", value: inferenceRunning, tone: "success" },
        { label: "异常", value: inferenceFailed, tone: "danger" },
        {
          label: "其他",
          value: getOtherCount(
            overview.inference_services.total,
            inferenceRunning,
            inferenceFailed,
          ),
          tone: "neutral",
        },
      ],
    },
    {
      id: "models",
      label: "模型仓库",
      value: overview.models.total,
      icon: "moxing",
      route: "/models",
      statuses: [
        { label: "可用", value: modelReady, tone: "success" },
        { label: "失败", value: modelFailed, tone: "danger" },
        {
          label: "其他",
          value: getOtherCount(overview.models.total, modelReady, modelFailed),
          tone: "neutral",
        },
      ],
    },
    {
      id: "knowledge-bases",
      label: "知识库",
      value: overview.knowledge_bases.total,
      icon: "zhishiku",
      route: "/kb",
      statuses: [
        { label: "活跃", value: knowledgeBaseActive, tone: "success" },
        {
          label: "其他",
          value: getOtherCount(overview.knowledge_bases.total, knowledgeBaseActive),
          tone: "neutral",
        },
      ],
    },
  ];
}

async function getSummaries(): Promise<HomeSummaryCard[]> {
  return toHomeSummaries(await getConsoleOverview());
}

const resourceTrendMeta: Record<HomeResourceTrendMetric, { name: string }> = {
  gpu: { name: "GPU 利用率" },
  cpu: { name: "CPU 利用率" },
  memory: { name: "内存利用率" },
};

const rangeQueryConfig: Record<HomeTimeRange, { hours: number; step: string }> = {
  "1d": { hours: 24, step: "5m" },
  "7d": { hours: 7 * 24, step: "30m" },
  "30d": { hours: 30 * 24, step: "2h" },
};

function snapshot(
  labels: string[],
  headlines: HomeTrendHeadline[],
  series: HomeTrendSnapshot["series"],
): HomeTrendSnapshot {
  return { labels, headlines, series };
}

function getTaskResultText(task: AsyncTask, key: string): string | undefined {
  const value = task.result?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getTaskTitle(task: AsyncTask): string {
  const [domain, action] = task.task_type.split(".");
  const domainLabel = taskDomainLabels[domain] ?? task.resource_type ?? domain;
  const actionLabel = taskActionLabels[action];
  const taskLabel = actionLabel ? `${actionLabel}${domainLabel}` : task.task_type;
  const resourceName =
    getTaskResultText(task, "name") ??
    getTaskResultText(task, "instance_id") ??
    task.resource_id ??
    undefined;
  return resourceName ? `${taskLabel} ${resourceName}` : taskLabel;
}

function toHomeTask(task: AsyncTask): HomeTask {
  const status =
    task.status === "completed"
      ? "done"
      : task.status === "pending" || task.status === "running"
        ? "current"
        : "failed";
  const progress = Math.min(100, Math.max(0, task.progress_pct ?? 0));

  return {
    id: task.id,
    title: getTaskTitle(task),
    subtitle: `${taskStatusLabels[task.status]} · ${task.task_type}`,
    time: formatDateTime(task.created_at),
    status,
    progress: status === "current" ? progress : undefined,
  };
}

async function getTasks(filter: HomeTaskFilter): Promise<HomeTask[]> {
  const status = taskStatusByFilter[filter];
  const response = await listTasks({ limit: HOME_TASK_LIMIT, status });
  const tasks = await Promise.all(
    response.items.map(async (task) => {
      if (
        !task.task_type.startsWith("instance.") ||
        (task.status !== "pending" && task.status !== "running")
      ) {
        return task;
      }

      try {
        return await getTask(task.id);
      } catch {
        return task;
      }
    }),
  );
  const hasStatusChange = tasks.some((task) => task.status !== status);
  const filteredResponse = hasStatusChange
    ? await listTasks({ limit: HOME_TASK_LIMIT, status })
    : response;
  return filteredResponse.items.map(toHomeTask);
}

async function getResourceTrend(
  metric: HomeResourceTrendMetric,
  range: HomeTimeRange,
): Promise<HomeTrendSnapshot> {
  const config = rangeQueryConfig[range];
  const { start, end } = getPreviousHoursDateTimeRange(config.hours);
  const response = await queryResourceTrend({ metric, start, end, step: config.step });
  const points = response.results
    .flatMap((series) => series.values)
    .filter((point) => Number.isFinite(point.value) && isValidDateTime(point.timestamp));
  const latest = points.at(-1);

  return snapshot(
    points.map((point) => formatTrendTime(point.timestamp, range !== "1d")),
    latest
      ? [
          {
            label: "当前",
            value: Number(latest.value.toFixed(2)),
            unit: "%",
            color: BLUE,
          },
        ]
      : [],
    [
      {
        name: resourceTrendMeta[metric].name,
        color: BLUE,
        values: points.map((point) => point.value),
      },
    ],
  );
}

export const homeOverviewDataSource: HomeOverviewDataSource = {
  getSummaries,
  getTasks,
  getResourceTrend,
};
