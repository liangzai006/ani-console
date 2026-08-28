import {
  DataTable,
  DetailPageFrame,
  AliIcon,
} from '@/components/common'
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Button, Card, Empty, Message, Space, Typography } from "@arco-design/web-react"
import { AiServiceStatusTag } from "@/components/ai-services/AiServiceStatusTag";
import {
  inferencePolicyItems,
  inferenceServiceItems,
} from "../-ai-services-mock-data";

export const Route = createFileRoute(
  "/_authenticated/inference/policies/$policyId",
)({ component: InferencePolicyDetailPage });

function InferencePolicyDetailPage() {
  const { policyId } = Route.useParams();
  const navigate = useNavigate();
  const policy = inferencePolicyItems.find((item) => item.id === policyId);
  if (!policy) return <Empty description="未找到该策略演示数据" />;
  const relatedServices =
    policy.scope === "全部推理服务"
      ? inferenceServiceItems
      : inferenceServiceItems.filter((item) =>
          policy.scope.includes(item.name),
        );
  const [qpsText, concurrencyText] = policy.rules.split(" · ");
  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: "AI 服务" },
        { label: "推理服务" },
        { label: "限流与访问策略", to: "/inference/policies" },
        { label: policy.name },
      ]}
      title={policy.name}
      status={<AiServiceStatusTag status={policy.status} />}
      icon={<AliIcon name="constraint" size={28} />}
      headerItems={[
        { label: "策略 ID", value: policy.id },
        { label: "作用范围", value: policy.scope },
        { label: "更新时间", value: policy.updatedAt },
      ]}
      actions={
        <Space>
          <Button
            onClick={() =>
              Message.success(
                policy.status === "enabled"
                  ? "已停用（演示）"
                  : "已启用（演示）",
              )
            }
          >
            {policy.status === "enabled" ? "停用" : "启用"}
          </Button>
          <Button
            type="primary"
            onClick={() => Message.info("策略编辑表单将在下一阶段补充")}
          >
            编辑
          </Button>
        </Space>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: policy.id },
            { label: "策略名称", value: policy.name },
            {
              label: "状态",
              value: <AiServiceStatusTag status={policy.status} />,
            },
            { label: "作用范围", value: policy.scope },
            { label: "更新时间", value: policy.updatedAt },
          ],
        },
        {
          key: "summary",
          title: "规则摘要",
          fields: [
            { label: "QPS 限制", value: qpsText?.replace("QPS ", "") ?? "—" },
            {
              label: "并发限制",
              value: concurrencyText?.replace("并发 ", "") ?? "—",
            },
            { label: "关联服务", value: `${relatedServices.length} 个` },
            { label: "访问控制", value: "API Key" },
          ],
        },
        {
          key: "overview",
          title: "命中概览",
          fields: [
            { label: "今日请求", value: "86,420" },
            { label: "今日命中", value: "326" },
            { label: "拦截率", value: "0.38%" },
            { label: "超限响应", value: "HTTP 429" },
          ],
        },
      ]}
      tabs={[
        {
          key: "related",
          label: "关联资源",
          content: (
            <DataTable
              columns={[
                { title: "推理服务", dataIndex: "name" },
                {
                  title: "状态",
                  width: 120,
                  render: (_, item) => (
                    <AiServiceStatusTag status={item.status} />
                  ),
                },
                { title: "模型版本", dataIndex: "modelVersion" },
              ]}
              data={relatedServices}
              pagination={false}
              noDataElement={
                <Empty description="该策略当前作用于 API Key 或尚未关联推理服务" />
              }
            />
          ),
        },
        {
          key: "rules",
          label: "规则",
          content: (
            <Space direction="vertical" size={16} className="w-full">
              <Card title="请求速率" size="small">
                <Typography.Text>
                  {qpsText}，超出后返回 HTTP 429。
                </Typography.Text>
              </Card>
              <Card title="并发控制" size="small">
                <Typography.Text>
                  {concurrencyText}，用于保护推理服务容量。
                </Typography.Text>
              </Card>
              <Card title="访问范围" size="small">
                <Typography.Text>{policy.scope}</Typography.Text>
              </Card>
            </Space>
          ),
        },
        {
          key: "hits",
          label: "命中记录",
          content: (
            <DataTable
              columns={[
                { title: "时间", dataIndex: "time" },
                { title: "作用对象", dataIndex: "target" },
                { title: "命中规则", dataIndex: "rule" },
                { title: "结果", dataIndex: "result" },
              ]}
              data={[
                {
                  id: "1",
                  time: "2026-08-24 10:26:18",
                  target: policy.scope,
                  rule: qpsText,
                  result: "已限流",
                },
                {
                  id: "2",
                  time: "2026-08-24 10:24:02",
                  target: policy.scope,
                  rule: concurrencyText,
                  result: "已排队",
                },
              ]}
              pagination={false}
            />
          ),
        },
      ]}
      onBack={() => navigate({ to: "/inference/policies" })}
    />
  );
}
