import { withId } from "@/lib/id";
import {
  DataTable,
  DetailPageFrame,
  DetailPagePlaceholder,
  AliIcon,
  type ListColumn,
  StatusTag,
  TableSectionHeader,
} from "@/components/common";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Empty, Modal, Space, Spin, Tag, Typography } from "@arco-design/web-react";
import { listInstances, type InstanceRecord } from "@/api/instances";
import {
  deleteNetworkVpc,
  getNetworkVpc,
  listNetworkLoadBalancers,
  listNetworkRoutes,
  listNetworkSecurityGroups,
  listNetworkSubnets,
  type NetworkLoadBalancer,
  type NetworkRoute,
  type NetworkSecurityGroup,
  type NetworkSubnet,
  type NetworkVPC,
} from "@/api/network";

import { formatDateTime } from "@/lib/format";

type Vpc = NetworkVPC;
type Subnet = NetworkSubnet;
type SecurityGroup = NetworkSecurityGroup;
type LoadBalancer = NetworkLoadBalancer;
type Instance = InstanceRecord;

type RelatedResource = {
  id: string;
  kind: "子网" | "安全组" | "路由" | "负载均衡" | "实例";
  name: string;
  status: string;
  group: "网络" | "算力";
};

export function VpcDetailPage({ vpcId }: { vpcId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detail = useQuery({
    meta: {
      errorNotification: {
        id: withId("vpc", vpcId),
        action: `VPC 加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-vpc", vpcId],
    queryFn: () => getNetworkVpc(vpcId),
  });
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
        action: `安全组加载`,
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
        action: `负载均衡加载`,
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
        action: `关联实例加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["instances", "vpc", vpcId],
    queryFn: () => listInstances({ limit: 100, vpc_id: vpcId }),
  });
  const deleteVpc = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "vpc-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: () => deleteNetworkVpc(vpcId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network-vpcs"] });
      navigate({ to: "/vpcs" });
    },
  });

  if (detail.isLoading && !detail.data) {
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    );
  }
  if (!detail.data)
    return (
      <DetailPagePlaceholder
        breadcrumbs={[{ label: "网络" }, { label: "VPC", to: "/vpcs" }, { label: vpcId }]}
        title={vpcId}
        idLabel="VPC ID"
        idValue={vpcId}
      />
    );

  const vpc = detail.data as Vpc;
  const vpcSubnets = (subnets.data?.items ?? []) as Subnet[];
  const vpcRoutes = (routes.data?.items ?? []) as NetworkRoute[];
  const associatedSecurityGroups = (securityGroups.data?.items ?? []) as SecurityGroup[];
  const associatedLoadBalancers = (loadBalancers.data?.items ?? []) as LoadBalancer[];
  const associatedInstances = (instances.data?.items ?? []) as Instance[];
  const relatedResources: RelatedResource[] = [
    ...vpcSubnets.map((item) => ({
      id: item.id,
      kind: "子网" as const,
      name: item.name,
      status: item.state,
      group: "网络" as const,
    })),
    ...associatedSecurityGroups.map((item) => ({
      id: item.id,
      kind: "安全组" as const,
      name: item.name,
      status: item.state,
      group: "网络" as const,
    })),
    ...vpcRoutes.map((item) => ({
      id: item.id,
      kind: "路由" as const,
      name: item.description || item.destination_cidr,
      status: "-",
      group: "网络" as const,
    })),
    ...associatedLoadBalancers.map((item) => ({
      id: item.id,
      kind: "负载均衡" as const,
      name: item.name,
      status: item.state,
      group: "网络" as const,
    })),
    ...associatedInstances.map((item) => ({
      id: item.id,
      kind: "实例" as const,
      name: item.name,
      status: item.state,
      group: "算力" as const,
    })),
  ];
  const networkRelatedResources = relatedResources.filter((resource) => resource.group === "网络");
  const computeRelatedResources = relatedResources.filter((resource) => resource.group === "算力");
  const relatedLoading =
    subnets.isLoading ||
    securityGroups.isLoading ||
    routes.isLoading ||
    loadBalancers.isLoading ||
    instances.isLoading;
  const relatedResourceColumns: Array<ListColumn<RelatedResource>> = [
    {
      title: "类型",
      width: 120,
      render: (_, resource) => <Tag>{resource.kind}</Tag>,
    },
    { title: "名称", dataIndex: "name" },
    { title: "资源 ID", dataIndex: "id" },
    {
      title: "状态",
      width: 120,
      render: (_, resource) => <StatusTag status={resource.status} />,
    },
  ];

  return (
    <DetailPageFrame
      breadcrumbs={[{ label: "网络" }, { label: "VPC", to: "/vpcs" }, { label: vpc.name }]}
      title={vpc.name}
      status={<StatusTag status={vpc.state} />}
      icon={<AliIcon name="VPCwangluo" size={28} />}
      headerItems={[
        { label: "VPC ID", value: vpc.id },
        { label: "CIDR", value: vpc.cidr },
        { label: "创建时间", value: formatDateTime(vpc.created_at) },
      ]}
      actions={
        <Space>
          <Button
            status="danger"
            loading={deleteVpc.isPending}
            onClick={() =>
              Modal.confirm({
                title: "删除 VPC",
                content: `确定删除「${vpc.name}」？存在子网或关联资源时无法删除，请先清理相关资源。`,
                okButtonProps: { status: "danger" },
                onOk: () => deleteVpc.mutateAsync(undefined),
              })
            }
          >
            删除
          </Button>
        </Space>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: vpc.id },
            { label: "名称", value: vpc.name },
            { label: "CIDR", value: vpc.cidr },
            { label: "状态", value: <StatusTag status={vpc.state} /> },
            { label: "创建时间", value: formatDateTime(vpc.created_at) },
            { label: "更新时间", value: formatDateTime(vpc.updated_at) },
          ],
        },
        {
          key: "related-summary",
          title: "关联摘要",
          fields: relatedLoading
            ? [{ label: "加载中…", value: "-" }]
            : relatedResources.length
              ? relatedResources.slice(0, 5).map((resource) => ({
                  label: resource.kind,
                  value: resource.name,
                }))
              : [{ label: "暂无关联对象", value: "-" }],
        },
      ]}
      tabs={[
        {
          key: "subnets",
          label: "子网",
          content: (
            <DataTable<Subnet>
              columns={[
                { title: "名称", dataIndex: "name" },
                { title: "CIDR", dataIndex: "cidr" },
                {
                  title: "网关",
                  dataIndex: "gateway",
                  placeholder: "-",
                },
                {
                  title: "状态",
                  width: 120,
                  render: (_, item) => <StatusTag status={item.state} />,
                },
              ]}
              data={vpcSubnets}
              loading={subnets.isLoading}
              pagination={false}
              noDataElement="当前 VPC 暂无子网"
            />
          ),
        },
        {
          key: "routes",
          label: "路由",
          content: (
            <DataTable<NetworkRoute>
              columns={[
                { title: "目标 CIDR", dataIndex: "destination_cidr" },
                { title: "下一跳类型", dataIndex: "next_hop_type" },
                { title: "下一跳", dataIndex: "next_hop_id" },
                {
                  title: "描述",
                  dataIndex: "description",
                  placeholder: "-",
                },
              ]}
              data={vpcRoutes}
              loading={routes.isLoading}
              pagination={false}
              noDataElement={<Empty />}
            />
          ),
        },
        {
          key: "related",
          label: "关联资源",
          content: (
            <Space direction="vertical" size={24} className="w-full">
              <section>
                <TableSectionHeader
                  title="网络关联"
                  extra={
                    <Typography.Text type="secondary">
                      {networkRelatedResources.length} 个
                    </Typography.Text>
                  }
                />
                <DataTable<RelatedResource>
                  columns={relatedResourceColumns}
                  data={networkRelatedResources}
                  loading={relatedLoading}
                  noDataElement={<Empty description="暂无网络关联资源" />}
                  pagination={false}
                  tableLabel="VPC 网络关联资源"
                />
              </section>
              <section>
                <TableSectionHeader
                  title="算力关联"
                  extra={
                    <Typography.Text type="secondary">
                      {computeRelatedResources.length} 个
                    </Typography.Text>
                  }
                />
                <DataTable<RelatedResource>
                  columns={relatedResourceColumns}
                  data={computeRelatedResources}
                  loading={relatedLoading}
                  noDataElement={<Empty description="暂无算力关联资源" />}
                  pagination={false}
                  tableLabel="VPC 算力关联资源"
                />
              </section>
            </Space>
          ),
        },
      ]}
      onBack={() => navigate({ to: "/vpcs" })}
    />
  );
}
