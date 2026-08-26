import ReactEChartsCore from 'echarts-for-react/lib/core'
import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer])

type CoreLineBarChartProps = {
  option: EChartsOption
  className?: string
  style?: React.CSSProperties
}

export function CoreLineBarChart({ option, className, style }: CoreLineBarChartProps) {
  return <ReactEChartsCore echarts={echarts} option={option} className={className} style={style} />
}
