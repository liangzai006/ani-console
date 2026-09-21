import { getInstance, type InstanceRecord } from "@/api/instances";
import type { NetworkRoute, NetworkVPC } from "@/api/network";
import { StatusTag } from "@/components/common";
import { withId } from "@/lib/id";
import { navigateToResourceDetail, type ResourceDetailTypeWithoutSearch } from "@/lib/resources";
import { Card, Empty, Link, List, Tag, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

type RelatedResource = {
  id: string;
  kind: "VPC" | "实例";
  name: string;
  status: string;
  detailType?: ResourceDetailTypeWithoutSearch;
};

function instanceDetailType(instance: InstanceRecord): ResourceDetailTypeWithoutSearch | undefined {
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

export function NetworkRouteRelatedResources({
  route,
  parentVpc,
  vpcLoading,
}: {
  route: NetworkRoute;
  parentVpc?: NetworkVPC;
  vpcLoading: boolean;
}) {
  const navigate = useNavigate();
  const instance = useQuery({
    meta: {
      errorNotification: {
        id: withId("route-instance", route.id),
        action: "下一跳实例加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["instance", "route-next-hop", route.next_hop_id],
    queryFn: () => getInstance(route.next_hop_id),
    enabled: route.next_hop_type === "instance" && Boolean(route.next_hop_id),
    retry: false,
  });
  const nextHopInstance = instance.data as InstanceRecord | undefined;
  const resources: RelatedResource[] = [
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
    <div className="flex flex-col gap-3">
      <Typography.Text>
        共 <Typography.Text bold>{resources.length}</Typography.Text> 个可确认的关联对象
      </Typography.Text>
      <Card title={`关联资源 ${resources.length}`} size="small">
        <List<RelatedResource>
          loading={vpcLoading || instance.isLoading}
          dataSource={resources}
          noDataElement={<Empty description="暂无可展示的关联资源" />}
          render={(resource) => (
            <div className="flex w-full items-center gap-3 px-5 py-3">
              <Tag className="shrink-0">{resource.kind}</Tag>
              <span className="min-w-0 flex-1 truncate">
                {resource.detailType ? (
                  <Link
                    onClick={() =>
                      navigateToResourceDetail(navigate, {
                        type: resource.detailType!,
                        id: resource.id,
                      })
                    }
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
  );
}
