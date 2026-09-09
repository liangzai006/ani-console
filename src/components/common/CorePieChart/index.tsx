import ReactEChartsCore from "echarts-for-react/lib/core";
import type { EChartsOption } from "echarts";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([PieChart, LegendComponent, TooltipComponent, CanvasRenderer]);

type CorePieChartProps = {
  option: EChartsOption;
  className?: string;
  style?: React.CSSProperties;
};

export function CorePieChart({ option, className, style }: CorePieChartProps) {
  return <ReactEChartsCore echarts={echarts} option={option} className={className} style={style} />;
}
