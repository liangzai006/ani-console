import { getInstance, type InstanceRecord } from "@/api/instances";
import { Button, Space, Spin, Tag, Tooltip } from "@arco-design/web-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ApiErrorAlert,
  AliIcon,
  DetailPageFrame,
  ImageNameText,
  StatusTag,
} from "@/components/common";
import { InstanceLogsPanel } from "@/components/instances/InstanceLogsPanel";
import { InstanceTerminal } from "@/components/instances/InstanceTerminal";
import { InstanceNetwork } from "@/components/instances/InstanceNetwork";
import { InstanceReleases } from "@/components/instances/InstanceReleases";
import { GpuInstanceActions } from "@/components/instances/GpuInstanceActions";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatDateTime } from "@/lib/format";
import { getImageDisplayName } from "@/lib/render";
import type { GpuInstanceDetailTabKey } from "@/lib/instance-detail-tabs";
import { InstanceConfiguration } from "@/components/instances/InstanceConfiguration";
import { InstanceEvents } from "@/components/instances/InstanceEvents";
import { InstanceMetrics } from "@/components/instances/InstanceMetrics";
import { InstanceOperations } from "@/components/instances/InstanceOperations";
import { InstanceStorage, type MountKind } from "@/components/instances/InstanceStorage";

type Instance = InstanceRecord;

const BUSY_STATES = new Set(["pending", "provisioning", "starting", "stopping", "deleting"]);

function imageLabel(instance: Instance) {
  return getImageDisplayName(instance.image);
}

function gpuLabel(instance: Instance) {
  if (!instance.gpu?.model && !instance.compute?.gpu_type) return "-";
  return `${instance.gpu?.model ?? instance.compute?.gpu_type} × ${instance.gpu?.count ?? 1}`;
}

export function GpuInstanceDetailPage({
  instanceId,
  tab,
  onTabChange,
}: {
  instanceId: string;
  tab: GpuInstanceDetailTabKey;
  onTabChange: (tab: GpuInstanceDetailTabKey) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mountKind, setMountKind] = useState<MountKind>();
  const detail = useQuery({
    queryKey: ["gpu-instance", instanceId],
    queryFn: () => getInstance(instanceId),
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
          { label: "GPU", value: "-" },
          { label: "创建时间", value: "-" },
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
  const busy = BUSY_STATES.has(instance.state);
  const terminalAvailable =
    instance.state === "running" && instance.access?.exec_available !== false;
  if (instance.kind !== "gpu_container") {
    return <ApiErrorAlert error={new Error("当前资源不是 GPU 容器实例")} title="资源类型不匹配" />;
  }

  const nodeName = instance.compute?.node_name ?? instance.node_name ?? "-";
  const gpuModel = instance.gpu?.model ?? instance.compute?.gpu_type;
  const gpuCount = instance.gpu?.count ?? 1;
  const cpu = instance.compute?.cpu;
  const memory = instance.compute?.memory;
  const cpuMemory =
    cpu != null || memory != null
      ? `${cpu != null ? `${String(cpu).replace(/C$/i, "")}C` : "-"}${
          memory != null ? String(memory).replace(/Gi$/i, "G").replace(/^\s+/, "") : "-"
        }`
      : "-";
  const rolloutLabels: Record<string, string> = {
    pending: "待发布",
    progressing: "发布中",
    healthy: "健康",
    degraded: "异常",
    rolled_back: "已回滚",
  };
  const workloadIdentity = instance.workload_identity;
  const workloadIdentityLabel = workloadIdentity?.active
    ? [workloadIdentity.key_prefix, ...(workloadIdentity.scopes ?? [])]
        .filter(Boolean)
        .join(" · ") || "-"
    : "-";
  const securityGroups = instance.network?.security_groups ?? [];
  const loadBalancerRefs = instance.network?.load_balancer_refs ?? [];
  const refreshInstance = () => {
    void detail.refetch();
    void queryClient.invalidateQueries({ queryKey: ["gpu-instances"] });
  };
  const relatedItems: Array<{
    key: string;
    kind: string;
    name: string;
    id?: string;
  }> = [];
  const relatedKeys = new Set<string>();
  const addRelated = (item: (typeof relatedItems)[number]) => {
    if (relatedKeys.has(item.key)) return;
    relatedKeys.add(item.key);
    relatedItems.push(item);
  };
  if (instance.network?.vpc_id ?? instance.vpc_id) {
    const id = String(instance.network?.vpc_id ?? instance.vpc_id);
    addRelated({
      key: `vpc/${id}`,
      kind: "VPC",
      name: instance.network?.vpc_name ?? id,
      id,
    });
  }
  if (instance.network?.subnet_id ?? instance.subnet_id) {
    const id = String(instance.network?.subnet_id ?? instance.subnet_id);
    addRelated({
      key: `subnet/${id}`,
      kind: "子网",
      name: instance.network?.subnet_name ?? id,
      id,
    });
  }
  securityGroups.forEach((group) =>
    addRelated({
      key: `security-group/${group.id}`,
      kind: "安全组",
      name: group.name ?? group.id,
      id: group.id,
    }),
  );
  (instance.volumes ?? []).forEach((volume) => {
    const id = volume.source_ref?.replace(/^volume\//, "");
    addRelated({
      key: volume.source_ref ?? `volume/${volume.name}`,
      kind: "云盘",
      name: volume.name,
      id,
    });
  });
  (instance.storage_attachments ?? []).forEach((attachment) => {
    const isFilesystem = attachment.resource_type === "filesystem";
    addRelated({
      key: `${attachment.resource_type}/${attachment.resource_id}`,
      kind: isFilesystem ? "文件存储" : attachment.resource_type,
      name: attachment.resource_name ?? attachment.resource_id,
      id: attachment.resource_id,
    });
  });
  if (instance.image?.id) {
    addRelated({
      key: `image/${instance.image.id}`,
      kind: "镜像",
      name: imageLabel(instance),
      id: instance.image.id,
    });
  }
  (instance.resource_refs ?? [])
    .filter((reference) => /secret|key|credential/i.test(reference))
    .forEach((reference) =>
      addRelated({
        key: reference,
        kind: "密钥",
        name: reference,
      }),
    );
  loadBalancerRefs.forEach((reference) =>
    addRelated({
      key: `load-balancer/${reference}`,
      kind: "负载均衡",
      name: reference,
      id: reference,
    }),
  );

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
            display="detail"
            onChanged={refreshInstance}
            onDeleted={() => {
              void queryClient.invalidateQueries({
                queryKey: ["gpu-instances"],
              });
              navigate({ to: "/gpu-instances" });
            }}
          />
        </Space>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: instance.id },
            {
              label: "状态",
              value: (
                <Space wrap size={4}>
                  <StatusTag status={instance.state} />
                  {instance.termination_protection ? <Tag color="orange">终止保护</Tag> : null}
                </Space>
              ),
            },
            {
              label: "规格",
              value: gpuModel ? `${gpuCount}×${gpuModel}` : "-",
            },
            { label: "镜像", value: <ImageNameText image={instance.image} /> },
            { label: "Provider", value: instance.provider },
            { label: "节点", value: nodeName },
            { label: "CPU / 内存", value: cpuMemory },
            { label: "GPU", value: gpuLabel(instance) },
            {
              label: "副本",
              value: instance.container
                ? `${instance.container.ready_replicas} / ${instance.container.replicas}`
                : "-",
            },
            {
              label: "修订 / 发布",
              value: instance.container
                ? [
                    instance.container.revision,
                    instance.container.rollout_status
                      ? (rolloutLabels[instance.container.rollout_status] ??
                        instance.container.rollout_status)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "-"
                : "-",
            },
            {
              label: "Workload Identity",
              value: workloadIdentityLabel,
            },
            {
              label: "负载均衡",
              value: loadBalancerRefs.length ? loadBalancerRefs.join("、") : "-",
            },
            {
              label: "调用地址",
              value: instance.endpoint ? (
                <a
                  href={instance.endpoint}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-[rgb(var(--link-6))]"
                >
                  {instance.endpoint}
                </a>
              ) : (
                "-"
              ),
            },
            {
              label: "安全组",
              value: securityGroups.length
                ? securityGroups.map((group) => group.name ?? group.id).join("、")
                : "-",
            },
            { label: "创建时间", value: formatDateTime(instance.created_at) },
            {
              label: "关联对象",
              value: (
                <span>
                  <strong>{relatedItems.length}</strong> 个
                </span>
              ),
            },
          ],
        },
        {
          key: "related-summary",
          title: "关联摘要",
          fields: relatedItems.length
            ? relatedItems.map((item) => {
                const summary = `${item.name}${
                  item.id && item.id !== item.name ? ` · ${item.id}` : ""
                }`;
                return {
                  label: item.kind,
                  value: (
                    <Tooltip content={summary}>
                      <span className="block min-w-0 truncate">{summary}</span>
                    </Tooltip>
                  ),
                };
              })
            : [{ label: "暂无关联对象", value: "-" }],
        },
      ]}
      tabs={[
        {
          key: "releases",
          label: "发布与回滚",
          content: (
            <InstanceReleases
              instance={instance}
              actions={
                <GpuInstanceActions
                  instance={instance}
                  display="release"
                  onChanged={refreshInstance}
                />
              }
            />
          ),
        },
        {
          key: "storage",
          label: "存储与挂载",
          content: (
            <InstanceStorage
              instance={instance}
              mountKind={mountKind}
              onMountKindChange={setMountKind}
              onChanged={() => detail.refetch()}
              volumeAction={
                <Button disabled={busy} onClick={() => setMountKind("volume")}>
                  挂载云盘
                </Button>
              }
              filesystemAction={
                <Button disabled={busy} onClick={() => setMountKind("filesystem")}>
                  挂载 NFS
                </Button>
              }
            />
          ),
        },
        {
          key: "configuration",
          label: "配置与密钥",
          content: (
            <InstanceConfiguration
              instance={instance}
              onChanged={() => detail.refetch()}
              secretAction={
                <GpuInstanceActions
                  instance={instance}
                  display="configuration"
                  onChanged={refreshInstance}
                />
              }
            />
          ),
        },
        {
          key: "gpu-metrics",
          label: "GPU 指标",
          content: (
            <InstanceMetrics
              instanceId={instance.id}
              instanceKind="gpu_container"
              gpuOnly
              gpuModel={instance.gpu?.model ?? instance.compute?.gpu_type}
              gpuCount={instance.gpu?.count}
            />
          ),
        },
        {
          key: "network",
          label: "网络",
          content: <InstanceNetwork instance={instance} />,
        },
        {
          key: "monitoring",
          label: "监控",
          content: <InstanceMetrics instanceId={instance.id} instanceKind="gpu_container" />,
        },
        {
          key: "logs",
          label: "日志",
          content: <InstanceLogsPanel instanceId={instance.id} active />,
        },
        {
          key: "events",
          label: "事件",
          content: <InstanceEvents instanceId={instance.id} />,
        },
        {
          key: "terminal",
          label: "终端",
          content: terminalAvailable ? (
            <InstanceTerminal className="h-full" instanceId={instance.id} />
          ) : (
            <div className="py-12 text-center text-(--color-text-3)">终端仅运行中的实例可用</div>
          ),
        },
        {
          key: "operations",
          label: "操作历史",
          content: <InstanceOperations instanceId={instance.id} />,
        },
      ]}
      defaultTabKey="releases"
      activeTabKey={tab}
      onTabChange={(key) => onTabChange(key as GpuInstanceDetailTabKey)}
      onBack={() => navigate({ to: "/gpu-instances" })}
    />
  );
}
