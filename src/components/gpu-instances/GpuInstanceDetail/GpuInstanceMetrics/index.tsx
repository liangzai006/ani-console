import { Card, Empty, Grid, Statistic, Tooltip } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { CoreLineBarChart } from "@/components/common";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatBytes } from "@/lib/format";

type Metrics = components["schemas"]["InstanceMetrics"];
type RangeMetrics = components["schemas"]["ObservabilityRangeQueryResponse"];
type MonitoringTrendSeries = {
  name: string;
  values: RangeMetrics["results"][number]["values"];
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
    Number.isInteger(value / 1024)
      ? String(value / 1024)
      : (value / 1024).toFixed(1);
  return `${formatGiB(used)} / ${formatGiB(total)} GiB`;
}

export function GpuInstanceMetrics({
  instanceId,
  gpuOnly = false,
  gpuModel,
  gpuCount,
}: {
  instanceId: string;
  gpuOnly?: boolean;
  gpuModel?: string | null;
  gpuCount?: number | null;
}) {
  const metrics = useQuery({
    queryKey: ["gpu-instance-metrics", instanceId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET(
        "/instances/{instance_id}/metrics",
        { params: { path: { instance_id: instanceId } } },
      );
      if (error || !data) throw error ?? new Error("监控指标未返回结果");
      return data as Metrics;
    },
    refetchInterval: 5_000,
  });
  const gpuTrend = useQuery({
    queryKey: ["gpu-instance-utilization-trend", instanceId],
    enabled: gpuOnly,
    queryFn: async () => {
      const end = new Date();
      const start = new Date(end.getTime() - 60 * 60 * 1000);
      const { data, error } = await coreApi.GET("/observability/query_range", {
        params: {
          query: {
            query: `avg(DCGM_FI_DEV_GPU_UTIL{namespace="${instanceId}",pod="${instanceId}"})`,
            start: start.toISOString(),
            end: end.toISOString(),
            step: "1m",
          },
        },
      });
      if (error || !data) throw error ?? new Error("GPU 利用率趋势未返回结果");
      return data as RangeMetrics;
    },
    refetchInterval: 5_000,
  });
  const monitoringTrend = useQuery({
    queryKey: ["gpu-instance-resource-trend", instanceId],
    enabled: !gpuOnly,
    queryFn: async () => {
      const end = new Date();
      const start = new Date(end.getTime() - 60 * 60 * 1000);
      const queries = [
        {
          name: "CPU 利用率",
          promql: `100 * avg(rate(container_cpu_usage_seconds_total{namespace="${instanceId}",pod="${instanceId}",container!="",container!="POD"}[5m]))`,
        },
        {
          name: "内存利用率",
          promql: `100 * (sum(container_memory_working_set_bytes{namespace="${instanceId}",pod="${instanceId}",container!="",container!="POD"}) / sum(container_spec_memory_limit_bytes{namespace="${instanceId}",pod="${instanceId}",container!="",container!="POD"}))`,
        },
        {
          name: "GPU 利用率",
          promql: `avg(DCGM_FI_DEV_GPU_UTIL{namespace="${instanceId}",pod="${instanceId}"})`,
        },
      ];

      return Promise.all(
        queries.map(async ({ name, promql }): Promise<MonitoringTrendSeries> => {
          const { data, error } = await coreApi.GET("/observability/query_range", {
            params: {
              query: {
                query: promql,
                start: start.toISOString(),
                end: end.toISOString(),
                step: "1m",
              },
            },
          });
          if (error || !data) {
            throw error ?? new Error(`${name}趋势未返回结果`);
          }
          const result = data as RangeMetrics;
          return {
            name,
            values: result.results.flatMap((series) => series.values),
          };
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
      yAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%" } },
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
  const hasMonitoringTrend = monitoringTrend.data?.some(
    (series) => series.values.length > 0,
  );
  useListErrorNotification({
    id: `gpu-instance-metrics:${instanceId}:${gpuOnly ? "gpu" : "all"}`,
    title: "监控指标加载失败",
    error: metrics.error,
  });
  useListErrorNotification({
    id: `gpu-instance-utilization-trend:${instanceId}`,
    title: "GPU 利用率趋势加载失败",
    error: gpuTrend.error,
  });
  useListErrorNotification({
    id: `gpu-instance-resource-trend:${instanceId}`,
    title: "资源利用率趋势加载失败",
    error: monitoringTrend.error,
  });
  if (!metrics.data) return <Empty description="暂无监控指标" />;

  const data = metrics.data;
  if (gpuOnly) {
    const gpuModelSummary = gpuModel ? `${gpuModel}×${gpuCount ?? 1}` : "-";
    return (
      <Grid.Row gutter={[16, 16]}>
        <Grid.Col span={24}>
          <Card size="small">
            <Grid.Row gutter={16}>
              <Grid.Col span={8}>
                <div className="px-3 py-2">
                  <Statistic
                    title="GPU 利用率"
                    value={percent(data.gpu_utilization_pct)}
                  />
                </div>
              </Grid.Col>
              <Grid.Col span={8}>
                <div className="px-3 py-2">
                  <Statistic
                    title="显存"
                    value={gpuMemory(
                      data.gpu_memory_used_mb,
                      data.gpu_memory_total_mb,
                    )}
                  />
                </div>
              </Grid.Col>
              <Grid.Col span={8}>
                <Tooltip content={gpuModelSummary} disabled={!gpuModel}>
                  <div className="min-w-0 overflow-hidden px-3 py-2">
                    <Statistic
                      title="型号 × 数量"
                      className='w-full'
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
              <CoreLineBarChart
                option={utilizationTrendOption}
                style={{ height: 240 }}
              />
            ) : (
              <Empty description="暂无 GPU 利用率趋势数据" />
            )}
          </Card>
        </Grid.Col>
      </Grid.Row>
    );
  }

  return (
    <Grid.Row gutter={[16, 16]}>
      <Grid.Col span={24}>
        <Card size="small">
          <Grid.Row gutter={[16, 16]}>
            <Grid.Col span={6}>
              <div className="px-3 py-2">
                <Statistic
                  title="CPU 利用率"
                  value={percent(data.cpu_utilization_pct)}
                />
              </div>
            </Grid.Col>
            <Grid.Col span={6}>
              <div className="px-3 py-2">
                <Statistic
                  title="内存"
                  value={memory(data.memory_used_mb)}
                  suffix={`/ ${memory(data.memory_total_mb)}`}
                />
              </div>
            </Grid.Col>
            <Grid.Col span={6}>
              <div className="px-3 py-2">
                <Statistic
                  title="GPU 利用率"
                  value={percent(data.gpu_utilization_pct)}
                />
              </div>
            </Grid.Col>
            <Grid.Col span={6}>
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
        </Card>
      </Grid.Col>
      <Grid.Col span={24}>
        <Card title="资源利用率趋势" size="small">
          {hasMonitoringTrend ? (
            <CoreLineBarChart
              option={monitoringTrendOption}
              style={{ height: 280 }}
            />
          ) : (
            <Empty description="暂无资源利用率趋势数据" />
          )}
        </Card>
      </Grid.Col>
    </Grid.Row>
  );
}
