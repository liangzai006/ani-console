import { Card, Empty, Grid, Statistic } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";
import { useEffect, useMemo, useState } from "react";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { CoreLineBarChart } from "@/components/common";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatBytes } from "@/lib/format";

type Metrics = components["schemas"]["InstanceMetrics"];
type GpuTrendPoint = {
  timestamp: string;
  utilization?: number;
  memoryUtilization?: number;
};

function percent(value?: number | null) {
  if (value == null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function memory(value?: number | null) {
  return value == null ? "—" : formatBytes(value * 1024 * 1024);
}

function gpuMemory(used?: number | null, total?: number | null) {
  if (used == null || total == null) return "—";
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
    refetchInterval: 10_000,
  });
  const [gpuTrend, setGpuTrend] = useState<GpuTrendPoint[]>([]);
  useEffect(() => {
    const data = metrics.data;
    if (!data) return;
    const memoryUtilization =
      data.gpu_memory_used_mb != null && data.gpu_memory_total_mb
        ? (data.gpu_memory_used_mb / data.gpu_memory_total_mb) * 100
        : undefined;
    setGpuTrend((current) => {
      if (current.at(-1)?.timestamp === data.timestamp) return current;
      return [
        ...current,
        {
          timestamp: data.timestamp,
          utilization: data.gpu_utilization_pct ?? undefined,
          memoryUtilization,
        },
      ].slice(-30);
    });
  }, [metrics.data]);
  const trendLabels = gpuTrend.map((point) =>
    new Date(point.timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  );
  const utilizationTrendOption = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: "axis", valueFormatter: (value) => `${value}%` },
      grid: { left: 48, right: 16, top: 16, bottom: 30 },
      xAxis: { type: "category", boundaryGap: false, data: trendLabels },
      yAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%" } },
      series: [
        {
          type: "line",
          smooth: true,
          showSymbol: gpuTrend.length < 2,
          data: gpuTrend.map((point) => point.utilization ?? null),
        },
      ],
    }),
    [gpuTrend, trendLabels],
  );
  const memoryTrendOption = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: "axis", valueFormatter: (value) => `${value}%` },
      grid: { left: 48, right: 16, top: 16, bottom: 30 },
      xAxis: { type: "category", boundaryGap: false, data: trendLabels },
      yAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%" } },
      series: [
        {
          type: "line",
          smooth: true,
          showSymbol: gpuTrend.length < 2,
          data: gpuTrend.map((point) => point.memoryUtilization ?? null),
        },
      ],
    }),
    [gpuTrend, trendLabels],
  );
  useListErrorNotification({
    id: `gpu-instance-metrics:${instanceId}:${gpuOnly ? "gpu" : "all"}`,
    title: "监控指标加载失败",
    error: metrics.error,
  });
  if (!metrics.data) return <Empty description="暂无监控指标" />;

  const data = metrics.data;
  if (gpuOnly) {
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
                <div className="px-3 py-2">
                  <Statistic
                    title="型号 × 数量"
                    value={gpuModel ? `${gpuModel}×${gpuCount ?? 1}` : "—"}
                  />
                </div>
              </Grid.Col>
            </Grid.Row>
          </Card>
        </Grid.Col>
        <Grid.Col span={12}>
          <Card title="GPU 利用率趋势" size="small">
            <CoreLineBarChart
              option={utilizationTrendOption}
              style={{ height: 240 }}
            />
          </Card>
        </Grid.Col>
        <Grid.Col span={12}>
          <Card title="显存利用率趋势" size="small">
            <CoreLineBarChart option={memoryTrendOption} style={{ height: 240 }} />
          </Card>
        </Grid.Col>
      </Grid.Row>
    );
  }

  return (
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
  );
}
