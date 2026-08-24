import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Button,
  Card,
  Empty,
  Message,
  Space,
  Table,
  Typography,
} from "@arco-design/web-react";
import { AiServiceStatusTag } from "@/components/ai-services/AiServiceStatusTag";
import { DetailPageFrame } from "@/components/detailbase";
import { AliIcon } from "@/components/icons/AliIcon";
import {
  inferenceServiceItems,
  modelCatalogItems,
} from "../-ai-services-mock-data";

export const Route = createFileRoute("/_authenticated/models/$modelId")({
  component: ModelDetailPage,
});

function ModelDetailPage() {
  const { modelId } = Route.useParams();
  const navigate = useNavigate();
  const model = modelCatalogItems.find((item) => item.id === modelId);
  if (!model) return <Empty description="未找到该模型演示数据" />;
  const modelPrefix = model.name.replace(/-Instruct$/, "");
  const relatedServices = inferenceServiceItems.filter((item) =>
    item.modelVersion.startsWith(modelPrefix),
  );
  // const planned = (name: string) => <Empty description={`${name}将在后续阶段补充`} />
  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: "AI 服务" },
        { label: "模型仓库", to: "/models" },
        { label: model.name },
      ]}
      title={model.name}
      status={<AiServiceStatusTag status={model.status} />}
      icon={<AliIcon name="moxing" size={28} />}
      headerItems={[
        { label: "模型 ID", value: model.id },
        { label: "最新版本", value: model.latestVersion },
        { label: "更新时间", value: model.updatedAt },
      ]}
      actions={
        <Space>
          <Button onClick={() => Message.success("已收藏（演示）")}>
            收藏
          </Button>
          <Button type="primary" onClick={() => navigate({ to: "/inference" })}>
            部署
          </Button>
        </Space>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: model.id },
            { label: "名称", value: model.name },
            {
              label: "状态",
              value: <AiServiceStatusTag status={model.status} />,
            },
            { label: "来源", value: model.source },
            { label: "任务", value: model.task },
            { label: "规模", value: model.scale },
            { label: "最新版本", value: model.latestVersion },
            { label: "模型大小", value: model.size },
          ],
        },
        {
          key: "governance",
          title: "Catalog 信息",
          fields: [
            {
              label: "框架",
              value:
                model.task === "文本生成"
                  ? "Transformers"
                  : "Sentence Transformers",
            },
            {
              label: "许可证",
              value: model.source === "本地上传" ? "自定义" : "Apache-2.0",
            },
            { label: "Owner", value: model.source },
            { label: "部署数", value: `${relatedServices.length} 个` },
          ],
        },
        {
          key: "overview",
          title: "模型概览",
          fields: [
            { label: "适用场景", value: model.task },
            {
              label: "推荐引擎",
              value: model.task === "文本生成" ? "vLLM" : "TEI",
            },
            { label: "推荐精度", value: "BF16" },
            { label: "部署流程", value: "兼容性检查 → 部署" },
          ],
        },
      ]}
      tabs={[
        {
          key: "related",
          label: "关联资源",
          content: (
            <Table
              columns={[
                { title: "推理服务", dataIndex: "name" },
                {
                  title: "状态",
                  render: (_, item) => (
                    <AiServiceStatusTag status={item.status} />
                  ),
                },
                { title: "引擎", dataIndex: "engine" },
                { title: "副本 / GPU", dataIndex: "replicas" },
              ]}
              data={relatedServices}
              rowKey="id"
              pagination={false}
              noDataElement={<Empty description="暂无关联推理服务" />}
            />
          ),
        },
        // { key: 'model-card', label: '模型卡片（规划）', content: planned('模型卡片') },
        // { key: 'files', label: '文件管理（规划）', content: planned('文件管理') },
        // { key: 'imports', label: '导入任务（规划）', content: planned('导入任务') },
        // { key: 'versions', label: '版本生命周期（规划）', content: planned('版本生命周期') },
        // { key: 'evaluation', label: '模型评测（规划）', content: planned('模型评测') },
        // { key: 'optimization', label: '模型优化（规划）', content: planned('模型优化') },
        // { key: 'security', label: '治理安全（规划）', content: planned('治理安全') },
        // { key: 'lineage', label: '来源血缘（规划）', content: planned('来源血缘') },
        // { key: 'retirement', label: '版本退役（规划）', content: planned('版本退役') },
        // { key: 'feedback', label: '部署反馈（规划）', content: planned('部署反馈') },
        // { key: 'usage', label: '调用统计（规划）', content: planned('调用统计') },
        // { key: 'collaboration', label: '协作订阅（规划）', content: planned('协作订阅') },
        {
          key: "recommendation",
          label: "推荐配置",
          content: (
            <Card title="推荐部署配置" size="small">
              <Typography.Paragraph>
                引擎：{model.task === "文本生成" ? "vLLM" : "TEI"} · 精度：BF16
                · 最小副本：1 · 自动扩缩容：建议开启
              </Typography.Paragraph>
            </Card>
          ),
        },
        {
          key: "history",
          label: "操作历史",
          content: (
            <Table
              columns={[
                { title: "操作", dataIndex: "action" },
                { title: "结果", dataIndex: "result" },
                { title: "时间", dataIndex: "time" },
              ]}
              data={[
                {
                  id: "1",
                  action: "导入模型",
                  result: model.status === "failed" ? "失败" : "成功",
                  time: model.updatedAt,
                },
                {
                  id: "2",
                  action: "兼容性检查",
                  result: model.status === "available" ? "通过" : "等待中",
                  time: model.updatedAt,
                },
              ]}
              rowKey="id"
              pagination={false}
            />
          ),
        },
      ]}
      onBack={() => navigate({ to: "/models" })}
    />
  );
}
