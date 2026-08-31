import { Space, Spin, Tooltip } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import {
  ApiErrorAlert,
  AliIcon,
  DetailPageFrame,
  StatusTag,
} from "@/components/common";
import { GpuInstanceActions } from "@/components/gpu-instances/GpuInstanceActions";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatDateTime } from "@/lib/format";
import { GpuInstanceConfiguration } from "./GpuInstanceConfiguration";
import { GpuInstanceEvents } from "./GpuInstanceEvents";
import { GpuInstanceLogs } from "./GpuInstanceLogs";
import { GpuInstanceMetrics } from "./GpuInstanceMetrics";
import { GpuInstanceNetwork } from "./GpuInstanceNetwork";
import { GpuInstanceOperations } from "./GpuInstanceOperations";
import { GpuInstanceReleases } from "./GpuInstanceReleases";
import { GpuInstanceStorage } from "./GpuInstanceStorage";
import { GpuInstanceTerminal } from "./GpuInstanceTerminal";

type Instance = components["schemas"]["InstanceRecord"];

function imageLabel(instance: Instance) {
  return (
    instance.image?.ref ?? instance.image?.name ?? instance.image?.id ?? "—"
  );
}

function gpuLabel(instance: Instance) {
  if (!instance.gpu?.model && !instance.compute?.gpu_type) return "—";
  return `${instance.gpu?.model ?? instance.compute?.gpu_type} × ${instance.gpu?.count ?? 1}`;
}

export function GpuInstanceDetail({ instanceId }: { instanceId: string }) {
  const navigate = useNavigate();
  const detail = useQuery({
    queryKey: ["gpu-instance", instanceId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET("/instances/{instance_id}", {
        params: { path: { instance_id: instanceId } },
      });
      if (error || !data) {
        throw error ?? new Error("GPU 容器实例详情未返回结果");
      }
      return data as Instance;
    },
  });
  useListErrorNotification({
    id: `gpu-container-detail:${instanceId}`,
    title: "GPU 容器实例加载失败",
    error: detail.error,
  });

  if (detail.isLoading && !detail.data) {
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    );
  }

  if (!detail.data) {
    return (
      <DetailPageFrame
        breadcrumbs={[
          { label: "算力" },
          { label: "GPU 容器实例", to: "/gpu-instances" },
          { label: instanceId },
        ]}
        title={instanceId}
        icon={<AliIcon name="GPUrongqishili" size={28} />}
        headerItems={[
          { label: "实例 ID", value: instanceId },
          { label: "GPU", value: "—" },
          { label: "创建时间", value: "—" },
        ]}
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [{ label: "实例 ID", value: instanceId }],
          },
        ]}
      />
    );
  }

  const instance = detail.data;
  if (instance.kind !== "gpu_container") {
    return (
      <ApiErrorAlert
        error={new Error("当前资源不是 GPU 容器实例")}
        title="资源类型不匹配"
      />
    );
  }

  const nodeName = instance.compute?.node_name ?? instance.node_name ?? "—";
  const privateIp = instance.network?.private_ip ?? instance.private_ip ?? "—";

  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: "算力" },
        { label: "GPU 容器实例", to: "/gpu-instances" },
        { label: instance.name },
      ]}
      title={instance.name}
      status={
        instance.reason ? (
          <Tooltip content={instance.reason}>
            <span className="inline-flex">
              <StatusTag status={instance.state} />
            </span>
          </Tooltip>
        ) : (
          <StatusTag status={instance.state} />
        )
      }
      icon={<AliIcon name="GPUrongqishili" size={28} />}
      headerItems={[
        { label: "实例 ID", value: instance.id },
        { label: "GPU", value: gpuLabel(instance) },
        { label: "创建时间", value: formatDateTime(instance.created_at) },
      ]}
      actions={
        <Space>
          <GpuInstanceActions
            instance={instance}
            display="menu"
            onChanged={() => detail.refetch()}
          />
        </Space>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: instance.id },
            { label: "名称", value: instance.name },
            { label: "状态", value: <StatusTag status={instance.state} /> },
            { label: "运行节点", value: nodeName },
            { label: "私网 IP", value: privateIp },
            { label: "Provider", value: instance.provider },
            { label: "创建时间", value: formatDateTime(instance.created_at) },
            { label: "更新时间", value: formatDateTime(instance.updated_at) },
          ],
        },
        {
          key: "runtime-summary",
          title: "运行摘要",
          fields: [
            { label: "镜像", value: imageLabel(instance) },
            {
              label: "副本",
              value: instance.container
                ? `${instance.container.ready_replicas} / ${instance.container.replicas}`
                : "—",
            },
            {
              label: "发布状态",
              value: instance.container?.rollout_status ?? "—",
            },
            {
              label: "修订版本",
              value: instance.container?.revision ?? "—",
            },
            { label: "CPU", value: instance.compute?.cpu ?? "—" },
            { label: "内存", value: instance.compute?.memory ?? "—" },
            { label: "GPU", value: gpuLabel(instance) },
            { label: "私网 IP", value: privateIp },
          ],
        },
      ]}
      tabs={[
        {
          key: "releases",
          label: "发布与回滚",
          content: <GpuInstanceReleases instance={instance} />,
        },
        {
          key: "storage",
          label: "存储与挂载",
          content: (
            <GpuInstanceStorage
              instance={instance}
              onChanged={() => detail.refetch()}
            />
          ),
        },
        {
          key: "configuration",
          label: "配置与密钥",
          content: <GpuInstanceConfiguration instance={instance} />,
        },
        {
          key: "gpu-metrics",
          label: "GPU 指标",
          content: <GpuInstanceMetrics instanceId={instance.id} gpuOnly />,
        },
        {
          key: "network",
          label: "网络",
          content: <GpuInstanceNetwork instance={instance} />,
        },
        {
          key: "monitoring",
          label: "监控",
          content: <GpuInstanceMetrics instanceId={instance.id} />,
        },
        {
          key: "logs",
          label: "日志",
          content: <GpuInstanceLogs instanceId={instance.id} />,
        },
        {
          key: "events",
          label: "事件",
          content: <GpuInstanceEvents instanceId={instance.id} />,
        },
        {
          key: "terminal",
          label: "终端",
          content: <GpuInstanceTerminal />,
        },
        {
          key: "operations",
          label: "操作历史",
          content: <GpuInstanceOperations instanceId={instance.id} />,
        },
      ]}
      defaultTabKey="releases"
      onBack={() => navigate({ to: "/gpu-instances" })}
    />
  );
}
