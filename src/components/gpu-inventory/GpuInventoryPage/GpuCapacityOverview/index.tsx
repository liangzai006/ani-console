import { Alert, Card, Empty, Grid, Skeleton } from "@arco-design/web-react";
import type { EChartsOption } from "echarts";
import type {
  GpuInventoryRecord,
  GpuOccupancyStats,
  GpuSpecAvailabilityListResponse,
  TenantQuotaResponse,
} from "@/api/gpu-inventory";
import { ApiErrorAlert, CorePieChart } from "@/components/common";
import { MetricCard } from "@/components/common/MetricCard";
import { GpuAdmissionSummary } from "./GpuAdmissionSummary";
import { GpuAnomalyList } from "./GpuAnomalyList";
import { GpuModelInventory } from "./GpuModelInventory";

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

export function GpuCapacityOverview({
  occupancy,
  occupancyLoading,
  occupancyError,
  availability,
  availabilityLoading,
  availabilityError,
  quota,
  quotaLoading,
  quotaError,
  anomalies,
  anomaliesLoading,
  anomaliesError,
  onCreate,
}: {
  occupancy?: GpuOccupancyStats;
  occupancyLoading: boolean;
  occupancyError: unknown;
  availability?: GpuSpecAvailabilityListResponse;
  availabilityLoading: boolean;
  availabilityError: unknown;
  quota?: TenantQuotaResponse;
  quotaLoading: boolean;
  quotaError: unknown;
  anomalies?: GpuInventoryRecord[];
  anomaliesLoading: boolean;
  anomaliesError: unknown;
  onCreate: () => void;
}) {
  const total = occupancy?.total ?? 0;
  const inUse = occupancy?.in_use ?? 0;
  const available = occupancy?.available ?? 0;
  const fault = occupancy?.fault ?? 0;
  const maintenance = Math.max(0, total - inUse - available - fault);
  const unavailable = fault + maintenance;
  const gpuQuota = quota?.items.find((item) => item.resource_type === "gpu_count");
  const chart: EChartsOption = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
    series: [
      {
        type: "pie",
        radius: ["42%", "70%"],
        center: ["50%", "43%"],
        label: { show: false },
        data: [
          { name: "占用中", value: inUse },
          { name: "空闲", value: available },
          { name: "异常 / 维护", value: unavailable },
        ],
      },
    ],
  };

  return (
    <div>
      {occupancyError ? (
        <ApiErrorAlert error={occupancyError} title="GPU 占用数据加载失败" />
      ) : null}
      {quotaError ? <ApiErrorAlert error={quotaError} title="租户 GPU 配额加载失败" /> : null}
      {occupancy?.dev_profile.real_provider === false ? (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          title="当前为开发数据源"
          content="页面数据来自 Core 本地开发配置，不代表真实 GPU 资源池状态。"
        />
      ) : null}
      <Grid.Row gutter={[16, 16]}>
        <Grid.Col xs={12} md={6}>
          <CapacityMetric
            loading={quotaLoading}
            title="配额卡数"
            value={gpuQuota ? gpuQuota.used + "/" + gpuQuota.total : "-"}
            extra="已用 / 上限"
          />
        </Grid.Col>
        <Grid.Col xs={12} md={6}>
          <CapacityMetric
            loading={quotaLoading}
            title="本租户预留"
            value={gpuQuota?.reserved ?? "-"}
            extra="BOSS 已分配未创建"
          />
        </Grid.Col>
        <Grid.Col xs={12} md={6}>
          <CapacityMetric
            loading={occupancyLoading}
            title="平台空闲"
            value={available}
            extra="共享池可抢"
          />
        </Grid.Col>
        <Grid.Col xs={12} md={6}>
          <CapacityMetric
            loading={occupancyLoading}
            title="异常卡"
            value={unavailable}
            extra="维护 + 不可用"
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row gutter={[16, 16]} className="mt-4">
        <Grid.Col xs={24} lg={9}>
          <Card title="占用分布" className="h-full">
            {occupancyLoading ? (
              <Skeleton animation text={{ rows: 5 }} />
            ) : total > 0 ? (
              <CorePieChart option={chart} className="h-56 w-full" />
            ) : (
              <div className="flex h-56 items-center justify-center">
                <Empty description="暂无 GPU 占用数据" />
              </div>
            )}
          </Card>
        </Grid.Col>
        <Grid.Col xs={24} lg={15}>
          <GpuAdmissionSummary
            availability={availability}
            loading={availabilityLoading}
            error={availabilityError}
          />
        </Grid.Col>
      </Grid.Row>

      <GpuModelInventory occupancy={occupancy} loading={occupancyLoading} onCreate={onCreate} />

      <section className="mt-5">
        <GpuAnomalyList items={anomalies} loading={anomaliesLoading} error={anomaliesError} />
      </section>
    </div>
  );
}
