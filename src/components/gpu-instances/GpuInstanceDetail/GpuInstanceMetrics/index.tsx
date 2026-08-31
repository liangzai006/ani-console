import { Card, Empty, Grid, Progress, Statistic } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatBytes, formatDateTime } from "@/lib/format";

type Metrics = components["schemas"]["InstanceMetrics"];

function percent(value?: number | null) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

function memory(value?: number | null) {
  return value == null ? "—" : formatBytes(value * 1024 * 1024);
}

export function GpuInstanceMetrics({
  instanceId,
  gpuOnly = false,
}: {
  instanceId: string;
  gpuOnly?: boolean;
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
  });
  useListErrorNotification({
    id: `gpu-instance-metrics:${instanceId}:${gpuOnly ? "gpu" : "all"}`,
    title: "监控指标加载失败",
    error: metrics.error,
  });
  if (!metrics.data) return <Empty description="暂无监控指标" />;

  const data = metrics.data;
  const gpuMemoryPercent =
    data.gpu_memory_used_mb != null && data.gpu_memory_total_mb
      ? (data.gpu_memory_used_mb / data.gpu_memory_total_mb) * 100
      : undefined;

  if (gpuOnly) {
    return (
      <Card title="GPU 实时指标" size="small">
        <Grid.Row gutter={16}>
          <Grid.Col span={8}>
            <div className="px-3 py-2">
              <Statistic
                title="GPU 利用率"
                value={percent(data.gpu_utilization_pct)}
              />
              <Progress
                percent={data.gpu_utilization_pct ?? 0}
                showText={false}
              />
            </div>
          </Grid.Col>
          <Grid.Col span={8}>
            <div className="px-3 py-2">
              <Statistic
                title="GPU 显存"
                value={memory(data.gpu_memory_used_mb)}
                suffix={`/ ${memory(data.gpu_memory_total_mb)}`}
              />
              <Progress percent={gpuMemoryPercent ?? 0} showText={false} />
            </div>
          </Grid.Col>
          <Grid.Col span={8}>
            <div className="px-3 py-2">
              <Statistic title="GPU 温度" value="—" />
            </div>
          </Grid.Col>
        </Grid.Row>
        <div className="mt-4 text-sm text-[var(--color-text-3)]">
          数据时间：{formatDateTime(data.timestamp)}
        </div>
      </Card>
    );
  }

  const memoryPercent =
    data.memory_used_mb != null && data.memory_total_mb
      ? (data.memory_used_mb / data.memory_total_mb) * 100
      : undefined;

  return (
    <Card title="资源实时指标" size="small">
      <Grid.Row gutter={[16, 16]}>
        <Grid.Col span={8}>
          <div className="px-3 py-2">
            <Statistic
              title="CPU 利用率"
              value={percent(data.cpu_utilization_pct)}
            />
            <Progress
              percent={data.cpu_utilization_pct ?? 0}
              showText={false}
            />
          </div>
        </Grid.Col>
        <Grid.Col span={8}>
          <div className="px-3 py-2">
            <Statistic
              title="内存"
              value={memory(data.memory_used_mb)}
              suffix={`/ ${memory(data.memory_total_mb)}`}
            />
            <Progress percent={memoryPercent ?? 0} showText={false} />
          </div>
        </Grid.Col>
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
              title="网络接收"
              value={formatBytes(data.network_rx_bytes ?? undefined)}
            />
          </div>
        </Grid.Col>
        <Grid.Col span={8}>
          <div className="px-3 py-2">
            <Statistic
              title="网络发送"
              value={formatBytes(data.network_tx_bytes ?? undefined)}
            />
          </div>
        </Grid.Col>
      </Grid.Row>
      <div className="mt-4 text-sm text-[var(--color-text-3)]">
        数据时间：{formatDateTime(data.timestamp)}
      </div>
    </Card>
  );
}
