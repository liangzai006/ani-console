import {
  getInstanceMetrics,
  queryObservabilityRange,
  type InstanceRecord,
  type ObservabilityRangeQueryResponse,
} from "@/api/instances";
import { Alert, Card, Empty, Grid, Statistic, Tooltip } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { CoreLineBarChart } from "@/components/common";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { getErrorMessage } from "@/lib/errors";
import { formatBytes } from "@/lib/format";

type InstanceKind = InstanceRecord["kind"];
type RangeMetrics = ObservabilityRangeQueryResponse;
type MonitoringTrendSeries = {
  name: string;
  values: RangeMetrics["results"][number]["values"];
  error?: string;
};
type MonitoringTrendQuery = {
  name: string;
  promql: string;
  scale?: number;
};

function percent(value?: number | null) {
  if (value == null) return "-";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function percentTooltip(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Number(number.toFixed(2))}%` : "-";
}

function memory(value?: number | null) {
  return value == null ? "-" : formatBytes(value * 1024 * 1024);
}

function gpuMemory(used?: number | null, total?: number | null) {
  if (used == null || total == null) return "-";
  const formatGiB = (value: number) =>
    Number.isInteger(value / 1024) ? String(value / 1024) : (value / 1024).toFixed(1);
  return `${formatGiB(used)} / ${formatGiB(total)} GiB`;
}

export function InstanceMetrics({
  instanceId,
  instanceKind,
  gpuOnly = false,
  gpuModel,
  gpuCount,
}: {
  instanceId: string;
  instanceKind: InstanceKind;
  gpuOnly?: boolean;
  gpuModel?: string | null;
  gpuCount?: number | null;
}) {
  const hasGpuMetrics = instanceKind === "gpu_container";
  const metrics = useQuery({
    queryKey: ["instance-metrics", instanceId],
    queryFn: () => getInstanceMetrics(instanceId),
    refetchInterval: 5_000,
  });
  const gpuTrend = useQuery({
    queryKey: ["instance-gpu-utilization-trend", instanceId],
    enabled: gpuOnly && hasGpuMetrics,
    queryFn: async () => {
      const end = new Date();
      const start = new Date(end.getTime() - 60 * 60 * 1000);
      return queryObservabilityRange({
        query: `avg(DCGM_FI_DEV_GPU_UTIL{namespace="${instanceId}",pod="${instanceId}"})`,
        start: start.toISOString(),
        end: end.toISOString(),
        step: "1m",
      });
    },
    refetchInterval: 5_000,
  });
  const monitoringTrend = useQuery({
    queryKey: ["instance-resource-trend", instanceId, instanceKind],
    enabled: !gpuOnly,
    queryFn: async () => {
      const end = new Date();
      const start = new Date(end.getTime() - 60 * 60 * 1000);
      const queries: MonitoringTrendQuery[] =
        instanceKind === "vm"
          ? [
              {
                name: "CPU 利用率",
                promql: `rate(kubevirt_vmi_cpu_usage_seconds_total{namespace="${instanceId}",name="${instanceId}"}[5m])`,
                scale: 100,
              },
              {
                name: "内存利用率",
                promql: `(kubevirt_vmi_memory_domain_bytes{namespace="${instanceId}",name="${instanceId}"} - kubevirt_vmi_memory_usable_bytes{namespace="${instanceId}",name="${instanceId}"}) / kubevirt_vmi_memory_domain_bytes{namespace="${instanceId}",name="${instanceId}"}`,
                scale: 100,
              },
            ]
          : instanceKind === "sandbox"
            ? [
                {
                  name: "CPU 利用率",
                  promql: `100 * sum(rate(container_cpu_usage_seconds_total{namespace="${instanceId}",pod="${instanceId}",container="",id!~"/kata_overhead/.*"}[5m]))`,
                },
                {
                  name: "内存利用率",
                  promql: `100 * (1 - sum(kata_guest_meminfo{item="mem_available",cri_namespace="${instanceId}",cri_name="${instanceId}"}) / sum(kata_guest_meminfo{item="mem_total",cri_namespace="${instanceId}",cri_name="${instanceId}"}))`,
                },
              ]
            : [
                {
                  name: "CPU 利用率",
                  promql: `100 * avg(rate(container_cpu_usage_seconds_total{namespace="${instanceId}",pod="${instanceId}",container!="",container!="POD"}[5m]))`,
                },
                {
                  name: "内存利用率",
                  promql: `100 * (container_memory_working_set_bytes{namespace="${instanceId}",pod="${instanceId}",container!="",container!="POD"} / container_spec_memory_limit_bytes{namespace="${instanceId}",pod="${instanceId}",container!="",container!="POD"})`,
                },
                ...(hasGpuMetrics
                  ? [
                      {
                        name: "GPU 利用率",
                        promql: `avg(DCGM_FI_DEV_GPU_UTIL{namespace="${instanceId}",pod="${instanceId}"})`,
                      },
                    ]
                  : []),
              ];

      return Promise.all(
        queries.map(async ({ name, promql, scale }): Promise<MonitoringTrendSeries> => {
          try {
            const result = await queryObservabilityRange({
              query: promql,
              start: start.toISOString(),
              end: end.toISOString(),
              step: "30s",
            });
            if (!result.dev_profile.real_provider) {
              return {
                name,
                values: [],
                error: result.dev_profile.reason ?? `${name}趋势查询已降级`,
              };
            }
            return {
              name,
              values: result.results
                .flatMap((series) => series.values)
                .map((point) => ({
                  ...point,
                  value: point.value * (scale ?? 1),
                })),
            };
          } catch (error) {
            return {
              name,
              values: [],
              error: getErrorMessage(error, `${name}趋势查询失败`),
            };
          }
        }),
      );
    },
    refetchInterval: 5_000,
  });
  const gpuTrendPoints = useMemo(
    () => gpuTrend.data?.results.flatMap((series) => series.values) ?? [],
    [gpuTrend.data],
  );
  const trendLabels = gpuTrendPoints.map((point) =>
    new Date(point.timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
  const utilizationTrendOption = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: "axis", valueFormatter: percentTooltip },
      grid: { left: 48, right: 16, top: 16, bottom: 30 },
      xAxis: { type: "category", boundaryGap: false, data: trendLabels },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%" },
      },
      series: [
        {
          type: "line",
          smooth: true,
          showSymbol: gpuTrendPoints.length < 2,
          data: gpuTrendPoints.map((point) => point.value),
        },
      ],
    }),
    [gpuTrendPoints, trendLabels],
  );
  const monitoringTrendOption = useMemo<EChartsOption>(() => {
    return {
      tooltip: { trigger: "axis", valueFormatter: percentTooltip },
      legend: { bottom: 0 },
      grid: { left: 48, right: 16, top: 16, bottom: 48 },
      xAxis: { type: "time", boundaryGap: false },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%" },
      },
      series: (monitoringTrend.data ?? []).map((series) => ({
        name: series.name,
        type: "line",
        smooth: true,
        showSymbol: series.values.length < 2,
        data: series.values.map((point) => [point.timestamp, point.value]),
      })),
    };
  }, [monitoringTrend.data]);
  const hasMonitoringTrend = monitoringTrend.data?.some((series) => series.values.length > 0);
  const monitoringTrendErrors = (monitoringTrend.data ?? [])
    .filter((series) => series.error)
    .map((series) => `${series.name}：${series.error}`);
  useListErrorNotification({
    id: `instance-metrics:${instanceId}:${gpuOnly ? "gpu" : "all"}`,
    title: "监控指标加载失败",
    error: metrics.error,
  });
  useListErrorNotification({
    id: `instance-gpu-utilization-trend:${instanceId}`,
    title: "GPU 利用率趋势加载失败",
    error: gpuTrend.error,
  });
  useListErrorNotification({
    id: `instance-resource-trend:${instanceId}`,
    title: "资源利用率趋势加载失败",
    error: monitoringTrend.error,
  });
  if (gpuOnly && hasGpuMetrics) {
    if (!metrics.data) return <Empty description="暂无监控指标" />;
    const data = metrics.data;
    const gpuModelSummary = gpuModel ? `${gpuModel}×${gpuCount ?? 1}` : "-";
    return (
      <Grid.Row gutter={[16, 16]}>
        <Grid.Col span={24}>
          <Card size="small">
            <Grid.Row gutter={16}>
              <Grid.Col span={8}>
                <div className="px-3 py-2">
                  <Statistic title="GPU 利用率" value={percent(data.gpu_utilization_pct)} />
                </div>
              </Grid.Col>
              <Grid.Col span={8}>
                <div className="px-3 py-2">
                  <Statistic
                    title="显存"
                    value={gpuMemory(data.gpu_memory_used_mb, data.gpu_memory_total_mb)}
                  />
                </div>
              </Grid.Col>
              <Grid.Col span={8}>
                <Tooltip content={gpuModelSummary} disabled={!gpuModel}>
                  <div className="min-w-0 overflow-hidden px-3 py-2">
                    <Statistic
                      title="型号 × 数量"
                      className="w-full"
                      value={gpuModelSummary}
                      styleValue={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    />
                  </div>
                </Tooltip>
              </Grid.Col>
            </Grid.Row>
          </Card>
        </Grid.Col>
        <Grid.Col span={24}>
          <Card title="GPU 利用率趋势" size="small">
            {gpuTrendPoints.length ? (
              <CoreLineBarChart option={utilizationTrendOption} style={{ height: 240 }} />
            ) : (
              <Empty description="暂无 GPU 利用率趋势数据" />
            )}
          </Card>
        </Grid.Col>
      </Grid.Row>
    );
  }

  const data = metrics.data;
  return (
    <Grid.Row gutter={[16, 16]}>
      <Grid.Col span={24}>
        <Card size="small">
          {data ? (
            <Grid.Row gutter={[16, 16]}>
              <Grid.Col span={hasGpuMetrics ? 6 : 8}>
                <div className="px-3 py-2">
                  <Statistic title="CPU 利用率" value={percent(data.cpu_utilization_pct)} />
                </div>
              </Grid.Col>
              <Grid.Col span={hasGpuMetrics ? 6 : 8}>
                <div className="px-3 py-2">
                  <Statistic
                    title="内存"
                    value={memory(data.memory_used_mb)}
                    suffix={`/ ${memory(data.memory_total_mb)}`}
                  />
                </div>
              </Grid.Col>
              {hasGpuMetrics ? (
                <Grid.Col span={6}>
                  <div className="px-3 py-2">
                    <Statistic title="GPU 利用率" value={percent(data.gpu_utilization_pct)} />
                  </div>
                </Grid.Col>
              ) : null}
              <Grid.Col span={hasGpuMetrics ? 6 : 8}>
                <div className="px-3 py-2">
                  <Statistic
                    title="网络入 / 出"
                    value={`${formatBytes(
                      data.network_rx_bytes ?? undefined,
                    )} / ${formatBytes(data.network_tx_bytes ?? undefined)}`}
                  />
                </div>
              </Grid.Col>
            </Grid.Row>
          ) : (
            <Empty description="暂无监控指标" />
          )}
        </Card>
      </Grid.Col>
      <Grid.Col span={24}>
        <Card title="资源利用率趋势" size="small">
          {monitoringTrendErrors.length ? (
            <Alert
              type="warning"
              showIcon
              content={monitoringTrendErrors.join("；")}
              className="mb-4"
            />
          ) : null}
          {hasMonitoringTrend ? (
            <CoreLineBarChart option={monitoringTrendOption} style={{ height: 280 }} />
          ) : monitoringTrendErrors.length === 0 ? (
            <Empty description="暂无资源利用率趋势数据" />
          ) : null}
        </Card>
      </Grid.Col>
    </Grid.Row>
  );
}
