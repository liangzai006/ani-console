import { Card, Empty, Grid } from "@arco-design/web-react";
import { MetricCard } from "@/components/common/MetricCard";
import { PageHeader } from "@/components/shell/AppShell";

export function ComputeOverviewPage() {
  return (
    <div>
      <PageHeader title="我的资源概览" subtitle="查看当前租户的计算资源整体状态" />

      <div className="flex flex-col gap-4">
        <Grid.Row gutter={[16, 16]}>
          <Grid.Col xs={24} sm={12} xl={6}>
            <MetricCard title="实例总数" value="-" />
          </Grid.Col>
          <Grid.Col xs={24} sm={12} xl={6}>
            <MetricCard title="运行中" value="-" />
          </Grid.Col>
          <Grid.Col xs={24} sm={12} xl={6}>
            <MetricCard title="GPU 占用率" value="-" />
          </Grid.Col>
          <Grid.Col xs={24} sm={12} xl={6}>
            <MetricCard title="异常数" value="-" />
          </Grid.Col>
        </Grid.Row>

        <Card title="近期云主机">
          <Empty description="暂无云主机" />
        </Card>
      </div>
    </div>
  );
}
