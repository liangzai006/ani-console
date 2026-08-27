import type {
  HomeCpuItem,
  HomeOverviewData,
  HomeOverviewDataSource,
  HomeTimeRange,
  HomeTrendData,
  HomeTrendHeadline,
  HomeTrendSnapshot,
} from "./types";

const BLUE = "#0079D3";
const GREEN = "#67C23A";

function snapshot(
  labels: string[],
  headlines: HomeTrendHeadline[],
  series: HomeTrendSnapshot["series"],
): HomeTrendSnapshot {
  return { labels, headlines, series };
}

const labelsByRange: Record<HomeTimeRange, string[]> = {
  "1d": ["08:00", "12:00", "16:00", "20:00", "24:00"],
  "7d": ["7月13日", "7月14日", "7月15日", "7月16日", "7月17日"],
  "30d": ["7月1日", "7月8日", "7月15日", "7月22日", "7月30日"],
};

const primaryTrend: HomeTrendData = {
  title: "资源趋势",
  yMax: 4,
  yInterval: 1,
  ranges: {
    "1d": snapshot(
      labelsByRange["1d"],
      [{ label: "今日", value: 2.8, unit: "TB", color: BLUE }],
      [{ name: "资源", color: BLUE, values: [1.8, 2.2, 2.5, 2.3, 2.8] }],
    ),
    "7d": snapshot(
      labelsByRange["7d"],
      [{ label: "7月13日", value: 3, unit: "TB", color: BLUE }],
      [{ name: "资源", color: BLUE, values: [1.4, 2.9, 2, 2.6, 3.2] }],
    ),
    "30d": snapshot(
      labelsByRange["30d"],
      [{ label: "7月", value: 3.4, unit: "TB", color: BLUE }],
      [{ name: "资源", color: BLUE, values: [1.2, 2.1, 2.7, 2.5, 3.4] }],
    ),
  },
};

const comparisonTrend: HomeTrendData = {
  title: "资源趋势",
  yMax: 4,
  yInterval: 1,
  ranges: {
    "1d": snapshot(
      labelsByRange["1d"],
      [
        { label: "资源A", value: 76, unit: "%", color: BLUE },
        { label: "资源B", value: 79, unit: "%", color: GREEN },
      ],
      [
        { name: "资源A", color: BLUE, values: [1.7, 1.4, 2.4, 2.1, 2.8] },
        { name: "资源B", color: GREEN, values: [2.2, 1.9, 2.8, 2.5, 3.1] },
      ],
    ),
    "7d": snapshot(
      labelsByRange["7d"],
      [
        { label: "资源A", value: 81, unit: "%", color: BLUE },
        { label: "资源B", value: 81, unit: "%", color: GREEN },
      ],
      [
        { name: "资源A", color: BLUE, values: [2.4, 1.4, 2.7, 1.8, 3.3] },
        { name: "资源B", color: GREEN, values: [2.9, 2, 3.1, 2.5, 3.5] },
      ],
    ),
    "30d": snapshot(
      labelsByRange["30d"],
      [
        { label: "资源A", value: 84, unit: "%", color: BLUE },
        { label: "资源B", value: 86, unit: "%", color: GREEN },
      ],
      [
        { name: "资源A", color: BLUE, values: [1.6, 2.2, 2.8, 2.4, 3.4] },
        { name: "资源B", color: GREEN, values: [2.1, 2.8, 3.2, 2.9, 3.7] },
      ],
    ),
  },
};

const percentageTrend: HomeTrendData = {
  title: "资源趋势",
  yMax: 4,
  yInterval: 1,
  ranges: {
    "1d": snapshot(
      labelsByRange["1d"],
      [{ label: "今日", value: 78, unit: "%", color: BLUE }],
      [{ name: "资源", color: BLUE, values: [1.9, 1.6, 2.3, 2, 2.9] }],
    ),
    "7d": snapshot(
      labelsByRange["7d"],
      [{ label: "7月13日", value: 81, unit: "%", color: BLUE }],
      [{ name: "资源", color: BLUE, values: [2.4, 1.4, 2.7, 1.8, 3.3] }],
    ),
    "30d": snapshot(
      labelsByRange["30d"],
      [{ label: "7月", value: 85, unit: "%", color: BLUE }],
      [{ name: "资源", color: BLUE, values: [1.7, 2.3, 2.9, 2.6, 3.5] }],
    ),
  },
};

function cpuItems(values: number[]): HomeCpuItem[] {
  const names = [
    "oe-24.03txt",
    "oe-24.03txt",
    "chenxh-Harbor",
    "chenxh-Harbor",
    "chenxh-Harbor",
  ];
  const ids = ["vm_2krt5t", "vm_3lsu6v", "vm_9xyr1a", "vm_b4nd7c", "vm_p9qm2w"];
  return values.map((value, index) => ({
    id: `${ids[index]}-${value}`,
    instanceId: ids[index],
    name: names[index],
    value,
  }));
}

const mockOverview: HomeOverviewData = {
  user: {
    username: "console001",
    avatarText: "C",
    greeting: "早上好，欢迎使用AI专有云",
  },
  summaries: [
    {
      id: "instances",
      label: "实例总数",
      value: 99,
      icon: "yunzhuji",
      route: "/instances/vm",
      statuses: [
        { label: "运行中", value: 59, tone: "success" },
        { label: "异常", value: 20, tone: "danger" },
        { label: "其他", value: 20, tone: "neutral" },
      ],
    },
    {
      id: "inference-a",
      label: "推理服务",
      value: 5,
      icon: "tuili",
      route: "/instances/container",
      statuses: [
        { label: "运行中", value: 4, tone: "success" },
        { label: "异常", value: 0, tone: "danger" },
        { label: "其他", value: 1, tone: "neutral" },
      ],
    },
    {
      id: "inference-b",
      label: "推理服务",
      value: 5,
      icon: "tuili",
      route: "/instances/container",
      statuses: [
        { label: "运行中", value: 4, tone: "success" },
        { label: "异常", value: 0, tone: "danger" },
        { label: "其他", value: 1, tone: "neutral" },
      ],
    },
    {
      id: "models",
      label: "模型仓库",
      value: 4,
      icon: "moxing",
      route: "/registry",
      statuses: [
        { label: "可用", value: 1, tone: "success" },
        { label: "失败", value: 2, tone: "danger" },
        { label: "其他", value: 1, tone: "neutral" },
      ],
    },
    {
      id: "knowledge-a",
      label: "知识库",
      value: 3,
      icon: "zhishiku",
      route: "/vector-stores",
      statuses: [
        { label: "活跃", value: 2, tone: "success" },
        { label: "其他", value: 1, tone: "neutral" },
      ],
    },
    {
      id: "knowledge-b",
      label: "知识库",
      value: 3,
      icon: "zhishiku",
      route: "/vector-stores",
      statuses: [
        { label: "活跃", value: 2, tone: "success" },
        { label: "其他", value: 1, tone: "neutral" },
      ],
    },
  ],
  recentItems: [
    { id: "disk", name: "云盘", icon: "yunpan", route: "/volumes" },
    { id: "vm", name: "云主机", icon: "yunzhuji", route: "/instances/vm" },
    {
      id: "vpc",
      name: "VPC 网络",
      icon: "VPCwangluo",
      route: "/networks/vpcs",
    },
    { id: "snapshot", name: "快照", icon: "kuaizhaoguanli", route: "/volumes" },
    {
      id: "deployment",
      name: "部署任务",
      icon: "bushufuwuqi",
      route: "/instances/vm",
    },
  ],
  quickCreateItems: [
    {
      id: "create-vm",
      name: "创建云主机",
      icon: "yunzhuji",
      route: "/instances/vm/create",
    },
    {
      id: "create-container",
      name: "创建容器实例",
      icon: "rongqishili",
      route: "/instances/container/create",
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
      route: "/instances/sandbox/create",
    },
    {
      id: "create-k8s",
      name: "创建 K8s 集群",
      icon: "jiqun",
      route: "/k8s-clusters",
    },
  ],
  primaryTrend,
  comparisonTrend,
  percentageTrend,
  tasks: [
    {
      id: "task-1",
      title: "创建云主机 demo-vm-01",
      subtitle: "infer-chat",
      time: "08-09 12:47:58",
      status: "done",
    },
    {
      id: "task-2",
      title: "变配 vm_3lsu6v",
      subtitle: "infer-chat",
      time: "08-09 12:47:58",
      status: "done",
    },
    {
      id: "task-3",
      title: "部署模型 bert-base",
      subtitle: "infer-chat",
      time: "08-09 12:47:58",
      status: "done",
    },
    {
      id: "task-4",
      title: "创建快照 vm_9xyr1a",
      subtitle: "infer-demo-vm-0103",
      time: "08-09 12:47:58",
      status: "done",
    },
    {
      id: "task-5",
      title: "上传镜像 Ubuntu 24.04",
      subtitle: "infer-demo-vm-0103",
      time: "08-09 12:47:58",
      status: "done",
    },
    {
      id: "task-6",
      title: "扩容云盘 disk-01",
      subtitle: "infer-demo-vm-0103",
      time: "08-09 12:47:58",
      status: "failed",
    },
    {
      id: "task-7",
      title: "回滚快照 snap-02",
      subtitle: "infer-demo-vm-0103",
      time: "08-09 12:47:58",
      status: "failed",
    },
    {
      id: "task-8",
      title: "部署推理 bert-base",
      subtitle: "infer-chat",
      status: "current",
      progress: 44,
    },
    {
      id: "task-9",
      title: "物理机修改物理规格配置",
      subtitle: "infer-chat",
      status: "current",
      progress: 52,
    },
  ],
  cpu: {
    external: cpuItems([97.65, 85.26, 56.32, 56.32, 56.32]),
    internal: cpuItems([88.34, 73.18, 62.42, 49.8, 31.26]),
  },
};

const waitForMockResponse = () =>
  new Promise((resolve) => globalThis.setTimeout(resolve, 120));

export function createMockHomeOverviewDataSource(
  seed: HomeOverviewData = mockOverview,
): HomeOverviewDataSource {
  const data = structuredClone(seed);
  return {
    async getOverview() {
      await waitForMockResponse();
      return structuredClone(data);
    },
  };
}

// Replace this binding with an API-backed adapter when the overview endpoints are ready.
export const homeOverviewDataSource: HomeOverviewDataSource =
  createMockHomeOverviewDataSource();

export const homeOverviewMockData = structuredClone(mockOverview);
