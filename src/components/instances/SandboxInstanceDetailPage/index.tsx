import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Message,
  Modal,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { DataTable, ImageNameText, StatusTag } from "@/components/common";
import { PageHeader } from "@/components/shell/AppShell";
import { InstanceEvents } from "@/components/instances/InstanceEvents";
import { InstanceLogsPanel } from "@/components/instances/InstanceLogsPanel";
import { InstanceMetrics } from "@/components/instances/InstanceMetrics";
import { InstanceOperations } from "@/components/instances/InstanceOperations";
import { InstanceTerminal } from "@/components/instances/InstanceTerminal";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { formatDateTime } from "@/lib/format";
import type { SandboxInstanceDetailTabKey } from "@/lib/instance-detail-tabs";
import {
  getInstanceActionErrorMessage,
  getSandboxProviderLabel,
} from "@/lib/sandbox-instance";

type SecurityEvent = components["schemas"]["InstanceSecurityEvent"];
type LifecycleAction = "pause" | "resume" | "extend" | "touch_idle" | "delete";

function unavailable(description: string) {
  return <Empty description={description} />;
}

function SandboxSecurityEvents({ instanceId }: { instanceId: string }) {
  const query = useQuery({
    queryKey: ["sandbox-security-events", instanceId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET(
        "/instances/{instance_id}/security-events",
        {
          params: { path: { instance_id: instanceId }, query: { limit: 100 } },
        },
      );
      if (error || !data) throw error ?? new Error("安全事件未返回结果");
      return data.items as SecurityEvent[];
    },
  });
  useListErrorNotification({
    id: `sandbox-security:${instanceId}`,
    title: "安全事件加载失败",
    error: query.error,
  });
  return (
    <DataTable<SecurityEvent>
      data={query.data ?? []}
      loading={query.isLoading}
      pagination={false}
      noDataElement={<Empty description="暂无安全事件" />}
      columns={[
        {
          title: "级别",
          width: 100,
          render: (_, item) => (
            <Tag color={item.severity === "warning" ? "orange" : "blue"}>
              {item.severity}
            </Tag>
          ),
        },
        { title: "类型", dataIndex: "event_type", width: 180 },
        { title: "说明", dataIndex: "message" },
        {
          title: "发生时间",
          width: 180,
          render: (_, item) => formatDateTime(item.occurred_at),
        },
      ]}
    />
  );
}

export function SandboxInstanceDetailPage({
  instanceId,
  tab,
  onTabChange,
}: {
  instanceId: string;
  tab: SandboxInstanceDetailTabKey;
  onTabChange: (tab: SandboxInstanceDetailTabKey) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lifecycleScope = useIdempotencyScope("sandbox-instance-lifecycle", [
    "POST",
    instanceId,
  ]);
  const detail = useQuery({
    queryKey: ["instance", instanceId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET("/instances/{instance_id}", {
        params: { path: { instance_id: instanceId } },
      });
      if (error || !data)
        throw error ?? new Error("Sandbox 实例详情未返回结果");
      return data;
    },
  });
  useListErrorNotification({
    id: `sandbox-detail:${instanceId}`,
    title: "Sandbox 实例加载失败",
    error: detail.error,
  });

  const lifecycle = useMutation({
    mutationFn: async ({
      action,
      duration,
    }: {
      action: LifecycleAction;
      duration?: string;
    }) => {
      const submitData = { action, duration };
      const { error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instanceId } },
          body: lifecycleScope.withKey(submitData),
        },
      );
      if (error)
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error) }),
          status: response.status,
        };
      return action;
    },
    onSuccess: (action) => {
      lifecycleScope.reset();
      if (action === "delete") {
        Message.success("Sandbox 已销毁");
        navigate({ to: "/sandbox-instances" });
        return;
      }
      Message.success("操作已提交");
      queryClient.invalidateQueries({ queryKey: ["instance", instanceId] });
      queryClient.invalidateQueries({ queryKey: ["sandbox-instances"] });
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  if (detail.isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    );
  if (!detail.data) return <Empty description="暂无 Sandbox 实例详情" />;
  if (detail.data.kind !== "sandbox")
    return <Empty description="当前资源不是 Sandbox 实例" />;

  const instance = detail.data;
  const sandbox = instance.sandbox;
  const sessionState = sandbox?.session_state ?? instance.state;
  const running = sessionState === "running";
  const expired = sessionState === "expired";

  const confirmDestroy = () =>
    Modal.confirm({
      title: "销毁 Sandbox",
      content: `确认销毁 ${instance.name || instance.id}？工作区和未保存数据将不可恢复。`,
      okButtonProps: { status: "danger" },
      onOk: () => lifecycle.mutateAsync({ action: "delete" }),
    });

  return (
    <div className="space-y-5">
      <PageHeader
        title={instance.name || instance.id}
        subtitle="Sandbox 实例详情"
        extra={
          <Space wrap>
            <Button
              type="primary"
              disabled={!running}
              onClick={() => onTabChange("terminal")}
            >
              打开终端
            </Button>
            <Button
              disabled={expired}
              onClick={() =>
                lifecycle.mutate({ action: "extend", duration: "1h" })
              }
            >
              延长 1 小时
            </Button>
            <Button
              disabled={expired}
              onClick={() =>
                lifecycle.mutate({ action: running ? "pause" : "resume" })
              }
            >
              {running ? "暂停" : "恢复"}
            </Button>
            <Button
              disabled={!running}
              onClick={() =>
                lifecycle.mutate({ action: "touch_idle", duration: "30m" })
              }
            >
              活跃续期
            </Button>
            <Button status="danger" onClick={confirmDestroy}>
              销毁
            </Button>
            <Button
              type="text"
              onClick={() => navigate({ to: "/sandbox-instances" })}
            >
              返回列表
            </Button>
          </Space>
        }
      />

      {expired ? (
        <Alert
          type="warning"
          content="该 Sandbox 会话已过期。请销毁后重新创建；如果后端仍允许延长，刷新后会显示最新状态。"
        />
      ) : null}
      <Card>
        <Descriptions
          column={{ xs: 1, sm: 2, md: 4 }}
          data={[
            {
              label: "状态",
              value: (
                <Tooltip content={instance.reason ?? ""}>
                  <span>
                    <StatusTag status={sessionState} />
                  </span>
                </Tooltip>
              ),
            },
            { label: "Session TTL", value: sandbox?.session_timeout ?? "-" },
            { label: "出口策略", value: sandbox?.network_egress_policy ?? "-" },
            { label: "创建时间", value: formatDateTime(instance.created_at) },
          ]}
        />
      </Card>

      <Tabs
        activeTab={tab}
        onChange={(key) => onTabChange(key as SandboxInstanceDetailTabKey)}
        destroyOnHide
      >
        <Tabs.TabPane key="overview" title="概览">
          <div className="space-y-4">
            <Descriptions
              title="会话"
              column={1}
              data={[
                { label: "实例 ID", value: instance.id },
                { label: "会话状态", value: sessionState },
                {
                  label: "镜像",
                  value: <ImageNameText image={instance.image} />,
                },
                { label: "RuntimeClass", value: sandbox?.runtime_class ?? "-" },
                { label: "CPU", value: instance.compute?.cpu ?? "-" },
                { label: "内存", value: instance.compute?.memory ?? "-" },
              ]}
            />
            <Descriptions
              title="运行环境"
              column={1}
              data={[
                {
                  label: "Provider 状态",
                  value: getSandboxProviderLabel(instance),
                },
                { label: "Provider", value: instance.provider ?? "-" },
                {
                  label: "Real Provider",
                  value: String(
                    instance.dev_profile?.real_provider ??
                      sandbox?.dev_profile?.real_provider ??
                      false,
                  ),
                },
                {
                  label: "Resource refs",
                  value: instance.resource_refs?.join("，") || "-",
                },
              ]}
            />
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane key="access" title="访问与端口">
          {unavailable("连接令牌与预览端口尚未进入当前 Core OpenAPI")}
        </Tabs.TabPane>
        <Tabs.TabPane key="env" title="环境变量">
          {unavailable("Sandbox 环境变量管理接口尚未开放")}
        </Tabs.TabPane>
        <Tabs.TabPane key="terminal" title="终端">
          {running ? (
            <InstanceTerminal className="h-full" instanceId={instanceId} />
          ) : (
            unavailable("终端仅运行中的 Sandbox 可用")
          )}
        </Tabs.TabPane>
        <Tabs.TabPane key="code" title="代码解释器">
          {unavailable("代码解释器接口尚未进入当前 Core OpenAPI")}
        </Tabs.TabPane>
        <Tabs.TabPane key="files" title="文件">
          {unavailable("Sandbox 工作区文件接口尚未进入当前 Core OpenAPI")}
        </Tabs.TabPane>
        <Tabs.TabPane key="checkpoints" title="检查点">
          {unavailable("检查点创建、恢复与克隆接口尚未进入当前 Core OpenAPI")}
        </Tabs.TabPane>
        <Tabs.TabPane key="metrics" title="监控">
          {tab === "metrics" ? (
            <InstanceMetrics instanceId={instanceId} instanceKind="sandbox" />
          ) : null}
        </Tabs.TabPane>
        <Tabs.TabPane key="logs" title="日志">
          <InstanceLogsPanel instanceId={instanceId} active={tab === "logs"} />
        </Tabs.TabPane>
        <Tabs.TabPane key="events" title="事件">
          {tab === "events" ? <InstanceEvents instanceId={instanceId} /> : null}
        </Tabs.TabPane>
        <Tabs.TabPane key="security" title="安全事件">
          {tab === "security" ? (
            <SandboxSecurityEvents instanceId={instanceId} />
          ) : null}
        </Tabs.TabPane>
        <Tabs.TabPane key="operations" title="操作历史">
          {tab === "operations" ? (
            <InstanceOperations instanceId={instanceId} />
          ) : null}
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}
