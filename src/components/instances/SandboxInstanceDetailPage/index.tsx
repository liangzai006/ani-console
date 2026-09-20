import { withId } from "@/lib/id";
import { getInstance } from "@/api/instances";
import { Empty, Tooltip } from "@arco-design/web-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AliIcon,
  DetailPageFrame,
  DetailPagePlaceholder,
  ImageNameText,
  ResourceId,
  StatusTag,
} from "@/components/common";
import { InstanceLogsPanel } from "@/components/instances/InstanceLogsPanel";
import { InstanceMetrics } from "@/components/instances/InstanceMetrics";
import { InstanceOperations } from "@/components/instances/InstanceOperations";
import { SandboxInstanceActions } from "@/components/instances/SandboxInstanceActions";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getSandboxProviderLabel, type SandboxInstanceDetailTabKey } from "@/lib/instances";
import { SandboxAccessPanel } from "./SandboxAccessPanel";
import { SandboxCheckpointsPanel } from "./SandboxCheckpointsPanel";
import { SandboxCodeRunner } from "./SandboxCodeRunner";
import { SandboxEnvironmentPanel } from "./SandboxEnvironmentPanel";
import { SandboxEventsPanel } from "./SandboxEventsPanel";
import { SandboxFilesPanel } from "./SandboxFilesPanel";
import { formatDurationSeconds, sandboxEgressLabel, sandboxTimeoutLabel } from "./utils";

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
    meta: {
      errorNotification: {
        id: withId("sandbox", instanceId),
        action: "沙箱实例加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["instance", instanceId],
    queryFn: () => getInstance(instanceId),
  });
  const refreshDetail = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["instance", instanceId] }),
      queryClient.invalidateQueries({ queryKey: ["sandbox-instances"] }),
    ]);
  };

  if (!detail.data) {
    return <DetailPagePlaceholder loading={detail.isLoading} />;
  }

  const instance = detail.data;
  if (instance.kind !== "sandbox" || !instance.sandbox) {
    return <Empty description="当前资源不是 沙箱实例，或缺少 Sandbox 运行摘要" />;
  }

  const sandbox = instance.sandbox;
  const sessionState = sandbox.session_state ?? instance.state;
  const running = sessionState === "running";

  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: "算力" },
        { label: "沙箱实例", to: "/sandbox-instances" },
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
        />
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: <ResourceId value={instance.id} /> },
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
          label: "访问配置",
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
          key: "code",
          label: "运行代码",
          content: (
            <SandboxCodeRunner
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
          label: "资源监控",
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
          content: <SandboxEventsPanel instanceId={instanceId} />,
        },
        {
          key: "operations",
          label: "操作记录",
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
