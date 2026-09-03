import {
  Button,
  Descriptions,
  Dropdown,
  Menu,
  Message,
  Modal,
  Space,
  Tooltip,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { components } from "@/api/core-schema";
import {
  AliIcon,
  DetailPageFrame,
  ImageNameText,
  StatusTag,
} from "@/components/common";
import { InstanceLogsPanel } from "@/components/instances/InstanceLogsPanel";
import { InstanceEvents } from "@/components/instances/InstanceEvents";
import { InstanceMetrics } from "@/components/instances/InstanceMetrics";
import { InstanceOperations } from "@/components/instances/InstanceOperations";
import { InstanceConfiguration } from "@/components/instances/InstanceConfiguration";
import {
  InstanceStorage,
  type MountKind,
} from "@/components/instances/InstanceStorage";
import { InstanceTerminal } from "@/components/instances/InstanceTerminal";
import { InstanceReleases } from "@/components/instances/InstanceReleases";
import { InstanceReleaseActions } from "@/components/instances/InstanceReleaseActions";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { formatDateTime } from "@/lib/format";
import {
  getInstanceDisplayIp,
  getInstanceNetworkValue,
} from "@/lib/instance-network";
import type { ContainerInstanceDetailTabKey } from "@/lib/instance-detail-tabs";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { containerDetailDataSource } from "./data-source";

export function ContainerInstanceDetailPage({
  instanceId,
  tab,
  onTabChange,
}: {
  instanceId: string;
  tab: ContainerInstanceDetailTabKey;
  onTabChange: (tab: ContainerInstanceDetailTabKey) => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lifecycleScope = useIdempotencyScope("container-instance-lifecycle", [
    "POST",
    instanceId,
  ]);
  const [mountKind, setMountKind] = useState<MountKind>();

  const query = useQuery({
    queryKey: ["container-instance-detail", instanceId],
    queryFn: () => containerDetailDataSource.getDetail(instanceId),
  });
  useListErrorNotification({
    id: `container-instance-detail:${instanceId}`,
    title: "容器实例详情加载失败",
    error: query.error,
  });

  const lifecycle = useMutation({
    mutationFn: async (action: "start" | "stop" | "restart") => {
      const submitData = { action };
      await containerDetailDataSource.changePowerState(
        instanceId,
        lifecycleScope.withKey(submitData),
      );
      return action;
    },
    onSuccess: async (_, action) => {
      lifecycleScope.reset();
      const messages: Record<string, string> = {
        start: "启动操作已提交",
        stop: "停止操作已提交",
        restart: "重启操作已提交",
      };
      Message.success(messages[action] ?? "操作已提交");
      await qc.invalidateQueries({
        queryKey: ["container-instance-detail", instanceId],
      });
      await qc.invalidateQueries({ queryKey: ["container-instances"] });
    },
    onError: (e) =>
      Message.error(getInstanceActionErrorMessage(e, "lifecycle")),
  });

  const deleteInstance = useMutation({
    mutationFn: async () => {
      const submitData = { action: "delete" as const };
      await containerDetailDataSource.changePowerState(
        instanceId,
        lifecycleScope.withKey(submitData),
      );
    },
    onSuccess: async () => {
      lifecycleScope.reset();
      Message.success("实例已删除");
      await qc.invalidateQueries({ queryKey: ["container-instances"] });
      navigate({ to: "/container-instances" });
    },
    onError: (e) =>
      Message.error(getInstanceActionErrorMessage(e, "lifecycle")),
  });

  if (query.isLoading) {
    return <div>正在加载容器实例详情...</div>;
  }

  if (!query.data)
    return (
      <DetailPageFrame
        breadcrumbs={[
          { label: "容器实例", to: "/container-instances" },
          { label: instanceId },
        ]}
        title={instanceId}
        icon={<AliIcon name="rongqishili" size={28} />}
        headerItems={[
          { label: "实例 ID", value: instanceId },
          { label: "状态", value: "-" },
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

  const detail = query.data;

  const isRunning = detail.state === "running";
  const busy = [
    "pending",
    "provisioning",
    "starting",
    "stopping",
    "deleting",
  ].includes(detail.state ?? "");

  const nameValue =
    detail.compute?.cpu || detail.compute?.memory
      ? [detail.compute?.cpu, detail.compute?.memory]
          .filter(Boolean)
          .join(" / ")
      : "-";

  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: "容器实例", to: "/container-instances" },
        { label: detail.name },
      ]}
      icon={<AliIcon name="icon-rongqishili" size={28} />}
      title={detail.name}
      status={
        detail.reason ? (
          <Tooltip content={detail.reason}>
            <span className="inline-flex">
              <StatusTag status={detail.state} />
            </span>
          </Tooltip>
        ) : (
          <StatusTag status={detail.state} />
        )
      }
      headerItems={[
        { label: "镜像", value: <ImageNameText image={detail.image} /> },
        { label: "规格", value: nameValue },
        { label: "私网 IP", value: getInstanceDisplayIp(detail) || "-" },
      ]}
      actions={
        <Dropdown
          trigger="click"
          position="br"
          droplist={
            <Menu
              onClickMenuItem={(action) => {
                if (
                  action === "start" ||
                  action === "stop" ||
                  action === "restart"
                )
                  lifecycle.mutate(action);
                if (action === "terminal") onTabChange("terminal");
                if (action === "delete") {
                  Modal.confirm({
                    title: "删除实例",
                    content: `确定删除「${detail.name}」？删除后资源不可恢复。`,
                    okButtonProps: { status: "danger" },
                    onOk: () => deleteInstance.mutateAsync(),
                  });
                }
              }}
            >
              <Menu.Item
                key="start"
                disabled={
                  detail.state !== "stopped" && detail.state !== "failed"
                }
              >
                启动
              </Menu.Item>
              <Menu.Item
                key="stop"
                disabled={!isRunning || detail.termination_protection}
              >
                停止
              </Menu.Item>
              <Menu.Item key="restart" disabled={!isRunning}>
                重启
              </Menu.Item>
              <Menu.Item key="terminal" disabled={!isRunning}>
                打开终端
              </Menu.Item>
              <Menu.Item
                key="delete"
                disabled={busy || detail.termination_protection}
                style={{ color: "var(--color-danger-6)" }}
              >
                删除
              </Menu.Item>
            </Menu>
          }
        >
          <Button loading={lifecycle.isPending || deleteInstance.isPending}>
            更多操作
          </Button>
        </Dropdown>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "实例 ID", value: detail.id },
            { label: "Provider", value: detail.provider },
            { label: "节点", value: detail.node_name ?? "-" },
            { label: "状态说明", value: detail.reason ?? "-" },
            { label: "创建时间", value: formatDateTime(detail.created_at) },
            { label: "更新时间", value: formatDateTime(detail.updated_at) },
            {
              label: "终止保护",
              value: detail.termination_protection ? "已开启" : "未开启",
            },
          ],
        },
        {
          key: "resource",
          title: "资源状态",
          defaultCollapsed: true,
          fields: [
            {
              label: "副本",
              value:
                detail.container?.replicas != null
                  ? `${detail.container.ready_replicas ?? 0}/${detail.container.replicas}`
                  : "-",
            },
            {
              label: "发布状态",
              value: detail.container?.rollout_status ?? "-",
            },
            { label: "访问地址", value: detail.endpoint ?? "-" },
            { label: "VPC", value: getInstanceNetworkValue(detail, "vpc_id") },
            {
              label: "子网",
              value: getInstanceNetworkValue(detail, "subnet_id"),
            },
          ],
        },
      ]}
      tabs={[
        {
          key: "release",
          label: "发布与回滚",
          extra: (
            <InstanceReleaseActions
              instance={detail as components["schemas"]["InstanceRecord"]}
              onChanged={() => void query.refetch()}
            />
          ),
          content: (
            <InstanceReleases
              instance={detail as components["schemas"]["InstanceRecord"]}
            />
          ),
        },
        {
          key: "network",
          label: "网络",
          content: (
            <Descriptions
              column={1}
              data={[
                {
                  label: "VPC",
                  value: getInstanceNetworkValue(detail, "vpc_id"),
                },
                {
                  label: "子网",
                  value: getInstanceNetworkValue(detail, "subnet_id"),
                },
                {
                  label: "私网 IP",
                  value: getInstanceDisplayIp(detail) || "-",
                },
                { label: "访问地址", value: detail.endpoint ?? "-" },
              ]}
            />
          ),
        },
        {
          key: "storage",
          label: "存储与挂载",
          extra: (
            <Space>
              <Button disabled={busy} onClick={() => setMountKind("volume")}>
                挂载云盘
              </Button>
              <Button
                disabled={busy}
                onClick={() => setMountKind("filesystem")}
              >
                挂载 NFS
              </Button>
            </Space>
          ),
          content: (
            <InstanceStorage
              instance={detail as components["schemas"]["InstanceRecord"]}
              mountKind={mountKind}
              onMountKindChange={setMountKind}
              onChanged={() => void query.refetch()}
            />
          ),
        },
        {
          key: "configuration",
          label: "配置与密钥",
          content: (
            <InstanceConfiguration
              instance={detail as components["schemas"]["InstanceRecord"]}
              onChanged={() => void query.refetch()}
            />
          ),
        },
        {
          key: "monitoring",
          label: "监控",
          content: (
            <InstanceMetrics instanceId={instanceId} instanceKind="container" />
          ),
        },
        {
          key: "logs",
          label: "日志",
          content: <InstanceLogsPanel instanceId={instanceId} active={true} />,
        },
        {
          key: "events",
          label: "事件",
          content: <InstanceEvents instanceId={instanceId} />,
        },
        {
          key: "terminal",
          label: "终端",
          content: isRunning ? (
            <InstanceTerminal className="h-full" instanceId={instanceId} />
          ) : (
            <div className="py-12 text-center text-(--color-text-3)">
              终端仅运行中的实例可用
            </div>
          ),
        },
        {
          key: "operations",
          label: "操作历史",
          content: <InstanceOperations instanceId={instanceId} />,
        },
      ]}
      defaultTabKey="release"
      activeTabKey={tab}
      onTabChange={(key) => onTabChange(key as ContainerInstanceDetailTabKey)}
      onBack={() => navigate({ to: "/container-instances" })}
    />
  );
}
