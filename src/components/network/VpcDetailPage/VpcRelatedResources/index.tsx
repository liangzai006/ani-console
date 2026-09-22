import { listInstances, type InstanceRecord } from "@/api/instances";
import {
  listNetworkLoadBalancers,
  listNetworkRoutes,
  listNetworkSecurityGroups,
  listNetworkSubnets,
  type NetworkLoadBalancer,
  type NetworkRoute,
  type NetworkSecurityGroup,
  type NetworkSubnet,
} from "@/api/network";
import { DataTable, StatusTag, type ListColumn } from "@/components/common";
import { withId } from "@/lib/id";
import { Empty, Space, Tag, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";

type RelatedResource = {
  id: string;
  kind: "子网" | "安全组" | "路由" | "负载均衡" | "实例";
  name: string;
  status: string;
  group: "网络" | "算力";
};

export function VpcRelatedResources({ vpcId }: { vpcId: string }) {
  const subnets = useQuery({
    meta: {
      errorNotification: {
        id: withId("vpc-subnets", vpcId),
        action: `子网加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-subnets", vpcId],
    queryFn: () => listNetworkSubnets({ vpc_id: vpcId, limit: 100 }),
  });
  const routes = useQuery({
    meta: {
      errorNotification: {
        id: withId("vpc-routes", vpcId),
        action: `路由加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-routes", vpcId],
    queryFn: () => listNetworkRoutes({ vpc_id: vpcId, limit: 100 }),
  });
  const securityGroups = useQuery({
    meta: {
      errorNotification: {
        id: withId("vpc-security-groups", vpcId),
        action: "安全组加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-security-groups", "vpc-related"],
    queryFn: () => listNetworkSecurityGroups({ limit: 100, vpc_id: vpcId }),
  });
  const loadBalancers = useQuery({
    meta: {
      errorNotification: {
        id: withId("vpc-load-balancers", vpcId),
        action: "负载均衡加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-load-balancers", "vpc", vpcId],
    queryFn: () => listNetworkLoadBalancers({ limit: 100, vpc_id: vpcId }),
  });
  const instances = useQuery({
    meta: {
      errorNotification: {
        id: withId("vpc-instances", vpcId),
        action: "关联实例加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["instances", "vpc", vpcId],
    queryFn: () => listInstances({ limit: 100, vpc_id: vpcId }),
  });
  const resources: RelatedResource[] = [
    ...((subnets.data?.items ?? []) as NetworkSubnet[]).map((item) => ({
      id: item.id,
      kind: "子网" as const,
      name: item.name,
      status: item.state,
      group: "网络" as const,
    })),
    ...((securityGroups.data?.items ?? []) as NetworkSecurityGroup[]).map((item) => ({
      id: item.id,
      kind: "安全组" as const,
      name: item.name,
      status: item.state,
      group: "网络" as const,
    })),
    ...((routes.data?.items ?? []) as NetworkRoute[]).map((item) => ({
      id: item.id,
      kind: "路由" as const,
      name: item.description || item.destination_cidr,
      status: "-",
      group: "网络" as const,
    })),
    ...((loadBalancers.data?.items ?? []) as NetworkLoadBalancer[]).map((item) => ({
      id: item.id,
      kind: "负载均衡" as const,
      name: item.name,
      status: item.state,
      group: "网络" as const,
    })),
    ...((instances.data?.items ?? []) as InstanceRecord[]).map((item) => ({
      id: item.id,
      kind: "实例" as const,
      name: item.name,
      status: item.state,
      group: "算力" as const,
    })),
  ];
  const networkResources = resources.filter((resource) => resource.group === "网络");
  const computeResources = resources.filter((resource) => resource.group === "算力");
  const loading =
    subnets.isLoading ||
    routes.isLoading ||
    securityGroups.isLoading ||
    loadBalancers.isLoading ||
    instances.isLoading;
  const columns: Array<ListColumn<RelatedResource>> = [
    { title: "类型", width: 120, render: (_, resource) => <Tag>{resource.kind}</Tag> },
    { title: "名称", dataIndex: "name" },
    { title: "资源 ID", dataIndex: "id" },
    {
      title: "状态",
      width: 120,
      render: (_, resource) => <StatusTag status={resource.status} />,
    },
  ];

  return (
    <Space direction="vertical" size={24} className="w-full">
      <section>
        <DataTable<RelatedResource>
          header={{
            title: "网络关联",
            extra: <Typography.Text type="secondary">{networkResources.length} 个</Typography.Text>,
          }}
          columns={columns}
          data={networkResources}
          loading={loading}
          noDataElement={<Empty description="暂无网络关联资源" />}
          pagination={false}
          tableLabel="VPC 网络关联资源"
        />
      </section>
      <section>
        <DataTable<RelatedResource>
          header={{
            title: "算力关联",
            extra: <Typography.Text type="secondary">{computeResources.length} 个</Typography.Text>,
          }}
          columns={columns}
          data={computeResources}
          loading={loading}
          noDataElement={<Empty description="暂无算力关联资源" />}
          pagination={false}
          tableLabel="VPC 算力关联资源"
        />
      </section>
    </Space>
  );
}
