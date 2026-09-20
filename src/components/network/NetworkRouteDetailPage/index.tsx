import { withId } from "@/lib/id";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, Link, List, Modal, Tag, Typography } from "@arco-design/web-react";
import { getInstance, type InstanceRecord } from "@/api/instances";
import {
  deleteNetworkRoute,
  getNetworkRoute,
  getNetworkVpc,
  type NetworkRoute,
  type NetworkVPC,
} from "@/api/network";

import {
  AliIcon,
  DetailPageFrame,
  DetailPagePlaceholder,
  ResourceId,
  StatusTag,
} from "@/components/common";
import { formatDateTime } from "@/lib/format";
import { navigateToResourceDetail, type ResourceDetailTypeWithoutSearch } from "@/lib/resources";

type Vpc = NetworkVPC;
type Instance = InstanceRecord;
type RelatedResource = {
  id: string;
  kind: "VPC" | "实例";
  name: string;
  status: string;
  detailType?: ResourceDetailTypeWithoutSearch;
};

function instanceDetailType(instance: Instance): ResourceDetailTypeWithoutSearch | undefined {
  switch (instance.kind) {
    case "vm":
      return "vm-instance";
    case "container":
      return "container-instance";
    case "gpu_container":
      return "gpu-instance";
    case "sandbox":
      return "sandbox-instance";
    default:
      return undefined;
  }
}

export function NetworkRouteDetailPage({ routeId }: { routeId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detail = useQuery({
    meta: {
      errorNotification: {
        id: withId("route", routeId),
        action: `路由加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-route", routeId],
    queryFn: () => getNetworkRoute(routeId),
  });
  const vpc = useQuery({
    meta: {
      errorNotification: {
        id: withId("route-vpc", routeId),
        action: `VPC 加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-vpc", detail.data?.vpc_id],
    queryFn: () => getNetworkVpc(detail.data!.vpc_id),
    enabled: Boolean(detail.data?.vpc_id),
  });
  const instance = useQuery({
    meta: {
      errorNotification: {
        id: withId("route-instance", routeId),
        action: `下一跳实例加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["instance", "route-next-hop", detail.data?.next_hop_id],
    queryFn: () => getInstance(detail.data!.next_hop_id),
    enabled: detail.data?.next_hop_type === "instance" && Boolean(detail.data?.next_hop_id),
    retry: false,
  });
  const deleteRoute = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "route-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (_: undefined) => deleteNetworkRoute(routeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network-routes"] });
      navigate({ to: "/routes" });
    },
  });

  if (!detail.data) return <DetailPagePlaceholder loading={detail.isLoading} />;
  const item = detail.data as NetworkRoute;
  const parentVpc = vpc.data as Vpc | undefined;
  const nextHopInstance = instance.data as Instance | undefined;
  const name = item.description?.trim() || item.destination_cidr;
  const relatedResources: RelatedResource[] = [
    ...(parentVpc
      ? [
          {
            id: parentVpc.id,
            kind: "VPC" as const,
            name: parentVpc.name,
            status: parentVpc.state,
            detailType: "vpc" as const,
          },
        ]
      : []),
    ...(nextHopInstance
      ? [
          {
            id: nextHopInstance.id,
            kind: "实例" as const,
            name: nextHopInstance.name,
            status: nextHopInstance.state,
            detailType: instanceDetailType(nextHopInstance),
          },
        ]
      : []),
  ];
  return (
    <DetailPageFrame
      breadcrumbs={[{ label: "网络" }, { label: "路由", to: "/routes" }, { label: name }]}
      title={name}
      icon={<AliIcon name="VPCluyouqi" size={28} />}
      headerItems={[
        { label: "目标网段", value: item.destination_cidr },
        { label: "创建时间", value: formatDateTime(item.created_at) },
      ]}
      actions={
        <Button
          status="danger"
          loading={deleteRoute.isPending}
          onClick={() =>
            Modal.confirm({
              title: "删除路由",
              content: `确定删除「${name}」？删除后该转发规则将立即失效。`,
              okButtonProps: { status: "danger" },
              onOk: () => deleteRoute.mutateAsync(undefined),
            })
          }
        >
          删除
        </Button>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: <ResourceId value={item.id} /> },
            { label: "名称", value: item.description?.trim() || "-" },
            {
              label: "VPC",
              value: parentVpc?.name ?? (vpc.isLoading ? "加载中…" : item.vpc_id),
            },
            { label: "目标网段", value: item.destination_cidr },
            {
              label: "下一跳类型",
              value:
                item.next_hop_type === "instance"
                  ? "实例"
                  : item.next_hop_type === "nat"
                    ? "NAT"
                    : "网关",
            },
            { label: "下一跳", value: item.next_hop_id },
            { label: "创建时间", value: formatDateTime(item.created_at) },
          ],
        },
      ]}
      tabs={[
        {
          key: "related",
          label: "关联资源",
          content: (
            <div className="flex flex-col gap-3">
              <Typography.Text>
                共 <Typography.Text bold>{relatedResources.length}</Typography.Text>{" "}
                个可确认的关联对象
              </Typography.Text>
              <Card title={`关联资源 ${relatedResources.length}`} size="small">
                <List<RelatedResource>
                  loading={vpc.isLoading || instance.isLoading}
                  dataSource={relatedResources}
                  noDataElement={<Empty description="暂无可展示的关联资源" />}
                  render={(resource) => (
                    <div className="flex w-full items-center gap-3 px-5 py-3">
                      <Tag className="shrink-0">{resource.kind}</Tag>
                      <span className="min-w-0 flex-1 truncate">
                        {resource.detailType ? (
                          <Link
                            onClick={() => {
                              if (!resource.detailType) return;
                              navigateToResourceDetail(navigate, {
                                type: resource.detailType,
                                id: resource.id,
                              });
                            }}
                          >
                            {resource.name || resource.id}
                          </Link>
                        ) : (
                          resource.name || resource.id
                        )}
                      </span>
                      <Typography.Text className="shrink-0" type="secondary">
                        {resource.id}
                      </Typography.Text>
                      <StatusTag status={resource.status} />
                    </div>
                  )}
                />
              </Card>
            </div>
          ),
        },
      ]}
      onBack={() => navigate({ to: "/routes" })}
    />
  );
}
