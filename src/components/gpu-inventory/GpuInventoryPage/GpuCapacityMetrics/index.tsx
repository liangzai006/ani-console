import { Card, Grid, Skeleton } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { getMyQuota } from "@/api/gpu-inventory";
import { MetricCard } from "@/components/common/MetricCard";
import { useGpuOccupancyQuery } from "../useGpuOccupancyQuery";

function CapacityMetric({
  loading,
  title,
  value,
  extra,
}: {
  loading: boolean;
  title: string;
  value: string | number;
  extra: string;
}) {
  return loading ? (
    <Card className="h-full">
      <Skeleton animation text={{ rows: 2 }} />
    </Card>
  ) : (
    <MetricCard title={title} value={value} extra={extra} />
  );
}

export function GpuCapacityMetrics() {
  const occupancy = useGpuOccupancyQuery();
  const tenantQuota = useQuery({
    meta: {
      errorNotification: {
        id: "gpu-tenant-quota",
        action: "租户 GPU 配额加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["quotas", "me"],
    queryFn: getMyQuota,
  });
  const total = occupancy.data?.total ?? 0;
  const inUse = occupancy.data?.in_use ?? 0;
  const available = occupancy.data?.available ?? 0;
  const fault = occupancy.data?.fault ?? 0;
  const maintenance = Math.max(0, total - inUse - available - fault);
  const unavailable = fault + maintenance;
  const gpuQuota = tenantQuota.data?.items.find((item) => item.resource_type === "gpu_count");

  return (
    <Grid.Row gutter={[16, 16]}>
      <Grid.Col xs={12} md={6}>
        <CapacityMetric
          loading={tenantQuota.isLoading}
          title="配额卡数"
          value={gpuQuota ? gpuQuota.used + "/" + gpuQuota.total : "-"}
          extra="已用 / 上限"
        />
      </Grid.Col>
      <Grid.Col xs={12} md={6}>
        <CapacityMetric
          loading={tenantQuota.isLoading}
          title="本租户预留"
          value={gpuQuota?.reserved ?? "-"}
          extra="BOSS 已分配未创建"
        />
      </Grid.Col>
      <Grid.Col xs={12} md={6}>
        <CapacityMetric
          loading={occupancy.isLoading}
          title="平台空闲"
          value={available}
          extra="共享池可抢"
        />
      </Grid.Col>
      <Grid.Col xs={12} md={6}>
        <CapacityMetric
          loading={occupancy.isLoading}
          title="异常卡"
          value={unavailable}
          extra="维护 + 不可用"
        />
      </Grid.Col>
    </Grid.Row>
  );
}
