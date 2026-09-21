import { Table, Typography } from "@arco-design/web-react";
import type { TableColumnProps } from "@arco-design/web-react";
import { ResourcePageFrame, StatusIndicator, type StatusIndicatorTone } from "@/components/common";
import styles from "./index.module.css";

interface StatusSample {
  key: string;
  label: string;
  tone: StatusIndicatorTone;
  loading?: boolean;
  description: string;
  usage: string;
}

const STATUS_SAMPLES: StatusSample[] = [
  {
    key: "running",
    label: "运行中",
    tone: "primary",
    description: "资源正在正常运行或持续提供服务",
    usage: '<StatusIndicator tone="primary">运行中</StatusIndicator>',
  },
  {
    key: "stopped",
    label: "已停止",
    tone: "danger",
    description: "资源已停止，当前不可用",
    usage: '<StatusIndicator tone="danger">已停止</StatusIndicator>',
  },
  {
    key: "enabling",
    label: "启用中",
    tone: "primary",
    loading: true,
    description: "资源正在执行启用、创建或部署等异步操作",
    usage: '<StatusIndicator tone="primary" loading>启用中</StatusIndicator>',
  },
  {
    key: "deleted",
    label: "已删除",
    tone: "neutral",
    description: "资源已删除、已失效或不再参与当前流程",
    usage: '<StatusIndicator tone="neutral">已删除</StatusIndicator>',
  },
  {
    key: "paused",
    label: "已暂停",
    tone: "warning",
    description: "资源仍然存在，但需要关注或暂时停止处理",
    usage: '<StatusIndicator tone="warning">已暂停</StatusIndicator>',
  },
];

const COLUMNS: TableColumnProps<StatusSample>[] = [
  {
    title: "指示器",
    width: 160,
    render: (_, sample) => (
      <StatusIndicator tone={sample.tone} loading={sample.loading}>
        {sample.label}
      </StatusIndicator>
    ),
  },
  {
    title: "推荐语义",
    dataIndex: "description",
  },
  {
    title: "调用示例",
    width: 500,
    render: (_, sample) => <code className={styles.code}>{sample.usage}</code>,
  },
];

export function StatusIndicatorReferencePage() {
  return (
    <ResourcePageFrame
      header={{
        iconClassName: "icon-biaoqianguanli",
        title: "状态指示器",
        subtitle: "本地开发参考页，用于核对状态语义、颜色与加载动效",
      }}
    >
      <section className={styles.panel}>
        <div className={styles.intro}>
          <Typography.Title heading={5} className={styles.title}>
            基础状态
          </Typography.Title>
          <Typography.Paragraph className={styles.description}>
            样式基于列表页截图封装：浅色胶囊背景承载状态文字，前置圆点表示稳定状态，旋转图标表示处理中。
          </Typography.Paragraph>
        </div>

        <Table<StatusSample>
          rowKey="key"
          columns={COLUMNS}
          data={STATUS_SAMPLES}
          pagination={false}
          border={false}
          className={styles.table}
        />
      </section>
    </ResourcePageFrame>
  );
}
