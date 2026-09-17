import { withId } from "@/lib/id";
import { getInstance, type InstanceRecord } from "@/api/instances";
import { Button, Empty, Spin, Tooltip } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AliIcon, DetailPageFrame, ImageNameText, StatusTag } from "@/components/common";
import { InstanceEvents } from "@/components/instances/InstanceEvents";
import { InstanceLogsPanel } from "@/components/instances/InstanceLogsPanel";
import { InstanceMetrics } from "@/components/instances/InstanceMetrics";
import { InstanceResourceAssociations } from "@/components/instances/InstanceResourceAssociations";
import { InstanceOperations } from "@/components/instances/InstanceOperations";
import { VmInstanceActions } from "@/components/instances/VmInstanceActions";
import { formatDateTime } from "@/lib/format";
import { getImageDisplayName } from "@/lib/render";
import { openVmInstanceRemoteWindow, type ComputeInstanceDetailTabKey } from "@/lib/instances";
import { VmInstanceSnapshots } from "./VmInstanceSnapshots";
import { VmInstanceSshAccess } from "./VmInstanceSshAccess";
import { VmInstanceStorage } from "./VmInstanceStorage";

type VmInstance = InstanceRecord;

const BUSY_STATES = new Set<VmInstance["state"]>([
  "pending",
  "provisioning",
  "starting",
  "stopping",
  "deleting",
]);

function imageLabel(instance: VmInstance) {
  return getImageDisplayName(instance.image);
}

function specLabel(instance: VmInstance) {
  const cpu = instance.compute?.cpu;
  const memory = instance.compute?.memory;
  if (cpu == null && memory == null) return "-";
  const cpuText = cpu == null ? "-" : String(cpu).replace(/C$/i, "");
  return `${cpuText} / ${memory ?? "-"}`;
}

function flavorLabel(instance: VmInstance) {
  if (instance.compute?.spec_id) return instance.compute.spec_id;
  const cpu = instance.compute?.cpu;
  const memory = instance.compute?.memory;
  if (cpu == null || memory == null) return "-";
  const cpuText = String(cpu).replace(/C$/i, "");
  const memoryText = String(memory).replace(/Gi$/i, "G");
  return `${cpuText}C${memoryText}`;
}

export function VmInstanceDetailPage({
  instanceId,
  tab,
  onTabChange,
}: {
  instanceId: string;
  tab: ComputeInstanceDetailTabKey;
  onTabChange: (tab: ComputeInstanceDetailTabKey) => void;
}) {
  const navigate = useNavigate();
  const [mountKind, setMountKind] = useState<"volume" | "filesystem">();
  const detail = useQuery({
    meta: {
      errorNotification: {
        id: withId("vm", instanceId),
        action: "云主机详情加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["vm-instance", instanceId],
    queryFn: () => getInstance(instanceId),
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
          { label: "云主机", to: "/vm-instances" },
          { label: instanceId },
        ]}
        title={instanceId}
        headerItems={[
          { label: "实例 ID", value: instanceId },
          { label: "状态", value: "-" },
          { label: "创建时间", value: "-" },
        ]}
        cards={[]}
      />
    );
  }

  const instance = detail.data;
  if (instance.kind !== "vm") {
    return <Empty description="当前资源不是云主机 VM" />;
  }

  const autoStart = (instance as VmInstance & { auto_start?: boolean | null }).auto_start;
  const busy = BUSY_STATES.has(instance.state);
  const stable = instance.state === "running" || instance.state === "stopped";
  const securityGroups = instance.network?.security_groups ?? [];
  const loadBalancerRefs = instance.network?.load_balancer_refs ?? [];
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
      kind: volume.kind === "root_disk" ? "系统盘" : "云盘",
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
  const refreshDetail = () => void detail.refetch();

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "算力" },
          { label: "云主机 VM", to: "/vm-instances" },
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
        icon={<AliIcon name="yunzhuji" size={28} />}
        headerItems={[
          { label: "实例 ID", value: instance.id },
          { label: "CPU / 内存", value: specLabel(instance) },
          { label: "创建时间", value: formatDateTime(instance.created_at) },
        ]}
        actions={
          <VmInstanceActions
            instance={instance}
            display="detail"
            onOperationSubmitted={refreshDetail}
          />
        }
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [
              { label: "实例 ID", value: instance.id },
              { label: "状态", value: <StatusTag status={instance.state} /> },
              { label: "规格", value: flavorLabel(instance) },
              {
                label: "镜像",
                value: <ImageNameText image={instance.image} />,
              },
              {
                label: "节点",
                value: instance.compute?.node_name ?? instance.node_name ?? "-",
              },
              { label: "CPU / 内存", value: specLabel(instance) },
              {
                label: "私网 IP",
                value: instance.network?.private_ip ?? instance.private_ip ?? "-",
              },
              {
                label: "自动启动",
                value: typeof autoStart === "boolean" ? (autoStart ? "是" : "否") : "-",
              },
              {
                label: "安全组",
                value: securityGroups.length
                  ? securityGroups.map((group) => group.name ?? group.id).join(" · ")
                  : "-",
              },
              { label: "创建时间", value: formatDateTime(instance.created_at) },
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
            key: "ssh",
            label: "SSH 与访问",
            content: (
              <VmInstanceSshAccess
                instance={instance}
                onOpenConsole={() => openVmInstanceRemoteWindow(instance.id)}
              />
            ),
          },
          {
            key: "storage",
            label: "存储挂载",
            content: (
              <VmInstanceStorage
                instance={instance}
                mountKind={mountKind}
                onMountKindChange={setMountKind}
                onChanged={refreshDetail}
                volumeAction={
                  <Button disabled={!stable || busy} onClick={() => setMountKind("volume")}>
                    挂载云盘
                  </Button>
                }
                filesystemAction={
                  <Button disabled={!stable || busy} onClick={() => setMountKind("filesystem")}>
                    挂载 NFS
                  </Button>
                }
              />
            ),
          },
          {
            key: "snapshots",
            label: "快照",
            content: (
              <VmInstanceSnapshots
                instance={instance}
                canCreate={stable && !busy}
                canRollback={stable && !busy}
                onChanged={refreshDetail}
              />
            ),
          },
          {
            key: "resources",
            label: "资源关联",
            content: <InstanceResourceAssociations instance={instance} />,
          },
          {
            key: "monitoring",
            label: "监控",
            content: <InstanceMetrics instanceId={instance.id} instanceKind="vm" />,
          },
          {
            key: "logs",
            label: "日志",
            content: <InstanceLogsPanel instanceId={instance.id} active={tab === "logs"} />,
          },
          {
            key: "events",
            label: "事件",
            content: <InstanceEvents instanceId={instance.id} />,
          },
          {
            key: "operations",
            label: "操作历史",
            content: <InstanceOperations instanceId={instance.id} />,
          },
        ]}
        defaultTabKey="ssh"
        activeTabKey={tab}
        onTabChange={(key) => onTabChange(key as ComputeInstanceDetailTabKey)}
        onBack={() => navigate({ to: "/vm-instances" })}
      />
    </>
  );
}
