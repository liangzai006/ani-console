import { Card, Statistic, Typography } from "@arco-design/web-react";
import type { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  extra?: ReactNode;
}

/** 概览页指标卡（页面模板 2.0 §4.2：Card + Statistic） */
export function MetricCard({ title, value, extra }: MetricCardProps) {
  return (
    <Card className="h-full">
      <Statistic title={title} value={value} />
      {extra ? (
        <Typography.Text type="secondary" className="mt-1 block text-sm">
          {extra}
        </Typography.Text>
      ) : null}
    </Card>
  );
}
