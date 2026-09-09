import { Empty, Spin, Tooltip } from "@arco-design/web-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import {
  AliIcon,
  ApiErrorAlert,
  DetailPageFrame,
  ImageNameText,
  StatusTag,
} from "@/components/common";
import { InstanceEvents } from "@/components/instances/InstanceEvents";
import { InstanceLogsPanel } from "@/components/instances/InstanceLogsPanel";
import { InstanceMetrics } from "@/components/instances/InstanceMetrics";
import { InstanceOperations } from "@/components/instances/InstanceOperations";
import { SandboxInstanceActions } from "@/components/instances/SandboxInstanceActions";
import { InstanceTerminal } from "@/components/instances/InstanceTerminal";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { SandboxInstanceDetailTabKey } from "@/lib/instance-detail-tabs";
import { getSandboxProviderLabel } from "@/lib/sandbox-instance";
import { SandboxAccessPanel } from "./SandboxAccessPanel";
import { SandboxCheckpointsPanel } from "./SandboxCheckpointsPanel";
import { SandboxCodeRunner } from "./SandboxCodeRunner";
import { SandboxEnvironmentPanel } from "./SandboxEnvironmentPanel";
import { SandboxFilesPanel } from "./SandboxFilesPanel";
import { SandboxSecurityEvents } from "./SandboxSecurityEvents";
import {
  formatDurationSeconds,
  sandboxEgressLabel,
  sandboxStateLabel,
  sandboxTimeoutLabel,
} from "./utils";

type SandboxInstance = components["schemas"]["InstanceRecord"];

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

  const detail = useQuery({
    queryKey: ["instance", instanceId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET("/instances/{instance_id}", {
        params: { path: { instance_id: instanceId } },
      });
      if (error || !data) {
        throw error ?? new Error("Sandbox 实例详情未返回结果");
      }
      return data as SandboxInstance;
    },
  });
  useListErrorNotification({
    id: `sandbox-detail:${instanceId}`,
    title: "Sandbox 实例加载失败",
    error: detail.error,
  });

  const refreshDetail = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["instance", instanceId] }),
      queryClient.invalidateQueries({ queryKey: ["sandbox-instances"] }),
    ]);
  };

  if (detail.isLoading && !detail.data) {
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    );
  }

  if (detail.error && !detail.data) {
    return <ApiErrorAlert error={detail.error} title="Sandbox 实例加载失败" />;
  }

  if (!detail.data) {
    return <ApiErrorAlert error={new Error("Sandbox 实例不存在")} title="未找到资源" />;
  }

  const instance = detail.data;
  if (instance.kind !== "sandbox" || !instance.sandbox) {
    return (
      <ApiErrorAlert
        error={new Error("当前资源不是 Sandbox 实例，或缺少 Sandbox 运行摘要")}
        title="资源类型不匹配"
      />
    );
  }

  const sandbox = instance.sandbox;
  const sessionState = sandbox.session_state ?? instance.state;
  const running = sessionState === "running";
  const terminalAvailable = running && instance.access?.exec_available !== false;

  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: "算力" },
        { label: "Sandbox 实例", to: "/sandbox-instances" },
        { label: instance.name || instance.id },
      ]}
      title={instance.name || instance.id}
      status={
        instance.reason ? (
          <Tooltip content={instance.reason}>
            <span className="inline-flex">
              <StatusTag status={sessionState} />
            </span>
          </Tooltip>
        ) : (
          <StatusTag status={sessionState} />
        )
      }
      icon={<AliIcon name="Sandbox" size={28} />}
      headerItems={[
        { label: "实例 ID", value: instance.id },
        {
          label: "CPU / 内存",
          value:
            [instance.compute?.cpu, instance.compute?.memory]
              .filter((value) => value != null)
              .join(" / ") || "-",
        },
        { label: "创建时间", value: formatDateTime(instance.created_at) },
      ]}
      actions={
        <SandboxInstanceActions
          instance={instance}
          onChanged={() => void refreshDetail()}
          onDeleted={() => {
            void queryClient.invalidateQueries({
              queryKey: ["sandbox-instances"],
            });
            navigate({ to: "/sandbox-instances" });
          }}
          onTabChange={onTabChange}
        />
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "实例 ID", value: instance.id },
            { label: "状态", value: <StatusTag status={sessionState} /> },
            {
              label: "镜像",
              value: <ImageNameText image={instance.image} />,
            },
            {
              label: "CPU / 内存",
              value:
                [instance.compute?.cpu, instance.compute?.memory]
                  .filter((value) => value != null)
                  .join(" / ") || "-",
            },
            { label: "模板 ID", value: sandbox.template_id ?? "-" },
            { label: "RuntimeClass", value: sandbox.runtime_class },
            {
              label: "出口策略",
              value: sandboxEgressLabel(sandbox.network_egress_policy),
            },
            { label: "Provider", value: getSandboxProviderLabel(instance) },
            { label: "会话 TTL", value: sandbox.session_timeout },
            { label: "空闲超时", value: sandbox.idle_timeout ?? "-" },
            {
              label: "到期策略",
              value: sandboxTimeoutLabel(sandbox.on_timeout),
            },
            { label: "创建时间", value: formatDateTime(instance.created_at) },
          ],
        },
        {
          key: "related-summary",
          title: "关联摘要",
          fields: [
            { label: "关联 Agent", value: sandbox.agent_ref ?? "-" },
            {
              label: "预览端口",
              value: `${sandbox.ports?.length ?? 0} 个`,
            },
            {
              label: "检查点",
              value: `${sandbox.checkpoints?.length ?? 0} 个`,
            },
            {
              label: "环境变量",
              value: `${sandbox.env?.length ?? 0} 个`,
            },
            {
              label: "工作区文件",
              value:
                sandbox.files_summary?.file_count != null
                  ? `${sandbox.files_summary.file_count} 个 / ${formatBytes(
                      sandbox.files_summary.total_size_bytes,
                    )}`
                  : "-",
            },
            {
              label: "资源引用",
              value: instance.resource_refs?.join("、") || "-",
            },
            {
              label: "剩余时长",
              value: formatDurationSeconds(sandbox.remain_seconds),
            },
            {
              label: "空闲剩余",
              value: formatDurationSeconds(sandbox.idle_remain_seconds),
            },
            { label: "停止原因", value: sandbox.stop_reason ?? "-" },
            { label: "更新时间", value: formatDateTime(instance.updated_at) },
          ],
        },
      ]}
      tabs={[
        {
          key: "access",
          label: "访问与端口",
          content: (
            <SandboxAccessPanel instance={instance} onChanged={() => void refreshDetail()} />
          ),
        },
        {
          key: "env",
          label: "环境变量",
          content: <SandboxEnvironmentPanel sandbox={sandbox} />,
        },
        {
          key: "terminal",
          label: "终端",
          content: terminalAvailable ? (
            <InstanceTerminal className="h-full" instanceId={instanceId} />
          ) : (
            <Empty
              description={
                running
                  ? "当前 Sandbox Provider 未开放终端能力。"
                  : `终端仅运行中的 Sandbox 可用，当前状态：${sandboxStateLabel(sessionState)}。`
              }
            />
          ),
        },
        {
          key: "code",
          label: "代码解释器",
          content: (
            <SandboxCodeRunner
              instanceId={instanceId}
              running={running}
              onChanged={() => void refreshDetail()}
            />
          ),
        },
        {
          key: "files",
          label: "文件",
          content: (
            <SandboxFilesPanel
              instanceId={instanceId}
              running={running}
              onChanged={() => void refreshDetail()}
            />
          ),
        },
        {
          key: "checkpoints",
          label: "检查点",
          content: (
            <SandboxCheckpointsPanel
              instanceId={instanceId}
              sessionState={sessionState}
              onChanged={() => void refreshDetail()}
            />
          ),
        },
        {
          key: "metrics",
          label: "监控",
          content: <InstanceMetrics instanceId={instanceId} instanceKind="sandbox" />,
        },
        {
          key: "logs",
          label: "日志",
          content: <InstanceLogsPanel instanceId={instanceId} active />,
        },
        {
          key: "events",
          label: "事件",
          content: <InstanceEvents instanceId={instanceId} />,
        },
        {
          key: "security",
          label: "安全事件",
          content: <SandboxSecurityEvents instanceId={instanceId} />,
        },
        {
          key: "operations",
          label: "操作历史",
          content: <InstanceOperations instanceId={instanceId} />,
        },
      ]}
      defaultTabKey="access"
      activeTabKey={tab}
      onTabChange={(key) => onTabChange(key as SandboxInstanceDetailTabKey)}
      onBack={() => navigate({ to: "/sandbox-instances" })}
    />
  );
}
