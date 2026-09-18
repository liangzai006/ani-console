import { withId } from "@/lib/id";
import type { InstanceRecord } from "@/api/instances";
import { Tooltip } from "@arco-design/web-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AliIcon, DetailPageFrame, ImageNameText, StatusTag } from "@/components/common";
import { InstanceLogsPanel } from "@/components/instances/InstanceLogsPanel";
import { InstanceEvents } from "@/components/instances/InstanceEvents";
import { InstanceMetrics } from "@/components/instances/InstanceMetrics";
import { InstanceOperations } from "@/components/instances/InstanceOperations";
import { InstanceConfiguration } from "@/components/instances/InstanceConfiguration";
import { InstanceNetwork } from "@/components/instances/InstanceNetwork";
import { InstanceStorage } from "@/components/instances/InstanceStorage";
import { InstanceVersions } from "@/components/instances/InstanceVersions";
import { ContainerInstanceActions } from "@/components/instances/ContainerInstanceActions";
import { formatDateTime } from "@/lib/format";
import {
  getInstanceDisplayIp,
  getInstanceNetworkValue,
  type ContainerInstanceDetailTabKey,
} from "@/lib/instances";
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

  const query = useQuery({
    meta: {
      errorNotification: {
        id: withId("container", instanceId),
        action: "容器实例详情加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["container-instance-detail", instanceId],
    queryFn: () => containerDetailDataSource.getDetail(instanceId),
  });
  if (query.isLoading) {
    return <div>正在加载容器实例详情...</div>;
  }

  if (!query.data)
    return (
      <DetailPageFrame
        breadcrumbs={[{ label: "容器实例", to: "/container-instances" }, { label: instanceId }]}
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

  const nameValue =
    detail.compute?.cpu || detail.compute?.memory
      ? [detail.compute?.cpu, detail.compute?.memory].filter(Boolean).join(" / ")
      : "-";

  return (
    <DetailPageFrame
      breadcrumbs={[{ label: "容器实例", to: "/container-instances" }, { label: detail.name }]}
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
        <ContainerInstanceActions
          instance={detail}
          display="detail"
          onChanged={() => {
            void query.refetch();
            void qc.invalidateQueries({ queryKey: ["container-instances"] });
          }}
          onDeleted={() => {
            void qc.invalidateQueries({ queryKey: ["container-instances"] });
            navigate({ to: "/container-instances" });
          }}
        />
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
          label: "版本",
          content: (
            <InstanceVersions
              instance={detail as InstanceRecord}
              onChanged={() => void query.refetch()}
            />
          ),
        },
        {
          key: "configuration",
          label: "配置",
          content: (
            <InstanceConfiguration
              instance={detail as InstanceRecord}
              onChanged={() => void query.refetch()}
            />
          ),
        },
        {
          key: "storage",
          label: "数据卷",
          content: (
            <InstanceStorage
              instance={detail as InstanceRecord}
              onChanged={() => void query.refetch()}
            />
          ),
        },
        {
          key: "network",
          label: "网络",
          content: <InstanceNetwork instance={detail as InstanceRecord} />,
        },
        {
          key: "monitoring",
          label: "资源监控",
          content: <InstanceMetrics instanceId={instanceId} instanceKind="container" />,
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
          key: "operations",
          label: "操作记录",
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
