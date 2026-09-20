import { listInstances, type InstanceRecord } from "@/api/instances";
import {
  deleteNetworkSubnet,
  getNetworkSubnet,
  getNetworkVpc,
  listNetworkRoutes,
  type NetworkRoute,
  type NetworkSubnet,
  type NetworkVPC,
} from "@/api/network";
import {
  AliIcon,
  DataTable,
  DetailPageFrame,
  DetailPagePlaceholder,
  ResourceId,
  StatusTag,
  TableSectionHeader,
  type ListColumn,
} from "@/components/common";
import { withId } from "@/lib/id";
import {
  Button,
  Dropdown,
  Empty,
  Menu,
  Modal,
  Space,
  Tag,
  Typography,
} from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { formatDateTime } from "@/lib/format";

type Subnet = NetworkSubnet;
type Vpc = NetworkVPC;
type Instance = InstanceRecord;
type SubnetRouteRow = {
  id: string;
  destinationCidr: string;
  nextHopType: string;
  nextHop: string;
  priority: number;
  source: "系统" | "自定义";
  protected: boolean;
};

export function SubnetDetailPage({ subnetId }: { subnetId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detail = useQuery({
    meta: {
      errorNotification: {
        id: withId("subnet", subnetId),
        action: `子网加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-subnet", subnetId],
    queryFn: () => getNetworkSubnet(subnetId),
  });
  const vpc = useQuery({
    meta: {
      errorNotification: {
        id: withId("subnet-vpc", subnetId),
        action: `VPC 加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-vpc", detail.data?.vpc_id],
    queryFn: () => getNetworkVpc(detail.data!.vpc_id),
    enabled: Boolean(detail.data?.vpc_id),
  });
  const instances = useQuery({
    meta: {
      errorNotification: {
        id: withId("subnet-instances", subnetId),
        action: `关联实例加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["instances", "subnet", subnetId],
    queryFn: () => listInstances({ limit: 100, subnet_id: subnetId }),
  });
  const routes = useQuery({
    meta: {
      errorNotification: {
        id: withId("subnet-routes", subnetId),
        action: `路由加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-routes", "subnet-vpc", detail.data?.vpc_id],
    queryFn: () => listNetworkRoutes({ vpc_id: detail.data!.vpc_id, limit: 100 }),
    enabled: Boolean(detail.data?.vpc_id),
  });
  const deleteSubnet = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "subnet-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: () => deleteNetworkSubnet(subnetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network-subnets"] });
      navigate({ to: "/subnets" });
    },
  });

  if (!detail.data) return <DetailPagePlaceholder loading={detail.isLoading} />;

  const subnet = detail.data as Subnet;
  const parentVpc = vpc.data as Vpc | undefined;
  const associatedInstances = (instances.data?.items ?? []) as Instance[];
  const vpcRoutes = (routes.data?.items ?? []) as NetworkRoute[];
  const routeRows: SubnetRouteRow[] = [
    {
      id: "system-default",
      destinationCidr: "0.0.0.0/0",
      nextHopType: "本地",
      nextHop: "本地",
      priority: 100,
      source: "系统",
      protected: true,
    },
    ...vpcRoutes.map((item) => ({
      id: item.id,
      destinationCidr: item.destination_cidr,
      nextHopType:
        item.next_hop_type === "instance" ? "实例" : item.next_hop_type === "nat" ? "NAT" : "网关",
      nextHop: item.next_hop_id,
      priority: item.next_hop_type === "instance" ? 150 : 200,
      source: "自定义" as const,
      protected: false,
    })),
  ];
  const relatedResources = associatedInstances.map((item) => ({
    id: item.id,
    kind: "实例" as const,
    name: item.name,
    status: item.state,
  }));
  const relatedResourceColumns: Array<ListColumn<(typeof relatedResources)[number]>> = [
    {
      title: "类型",
      width: 120,
      render: (_, item) => <Tag>{item.kind}</Tag>,
    },
    { title: "名称", dataIndex: "name" },
    { title: "资源 ID", dataIndex: "id" },
    {
      title: "状态",
      width: 120,
      render: (_, item) => <StatusTag status={item.status} />,
    },
  ];
  const moreMenu = (
    <Menu
      onClickMenuItem={(key) => {
        if (key !== "delete") return;
        Modal.confirm({
          title: "删除子网",
          content: `确定删除「${subnet.name}」？存在关联实例时无法删除，请先清理相关资源。`,
          okButtonProps: { status: "danger" },
          onOk: () => deleteSubnet.mutateAsync(undefined),
        });
      }}
    >
      <Menu.Item
        key="delete"
        disabled={deleteSubnet.isPending}
        style={{ color: "var(--color-danger-6)" }}
      >
        删除
      </Menu.Item>
    </Menu>
  );

  return (
    <DetailPageFrame
      breadcrumbs={[{ label: "网络" }, { label: "子网", to: "/subnets" }, { label: subnet.name }]}
      title={subnet.name}
      status={<StatusTag status={subnet.state} />}
      icon={<AliIcon name="VPCwangluo" size={28} />}
      headerItems={[
        { label: "CIDR", value: subnet.cidr },
        { label: "创建时间", value: formatDateTime(subnet.created_at) },
      ]}
      actions={
        <Dropdown trigger="click" position="br" droplist={moreMenu}>
          <Button disabled={deleteSubnet.isPending} aria-label="更多操作" title="更多操作">
            <IconMoreVertical />
          </Button>
        </Dropdown>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: <ResourceId value={subnet.id} /> },
            { label: "名称", value: subnet.name },
            {
              label: "VPC",
              value: parentVpc?.name ?? (vpc.isLoading ? "加载中…" : subnet.vpc_id),
            },
            { label: "CIDR", value: subnet.cidr },
            { label: "网关", value: subnet.gateway ?? "-" },
            { label: "状态", value: <StatusTag status={subnet.state} /> },
            { label: "创建时间", value: formatDateTime(subnet.created_at) },
            { label: "更新时间", value: formatDateTime(subnet.updated_at) },
          ],
        },
      ]}
      tabs={[
        {
          key: "routes",
          label: "路由",
          content: (
            <Space direction="vertical" size={12} className="w-full">
              <DataTable<SubnetRouteRow>
                columns={[
                  { title: "目标网段", dataIndex: "destinationCidr" },
                  { title: "下一跳类型", dataIndex: "nextHopType" },
                  { title: "下一跳", dataIndex: "nextHop" },
                  { title: "优先级", dataIndex: "priority" },
                  { title: "来源", dataIndex: "source" },
                ]}
                data={routeRows}
                loading={routes.isLoading}
                pagination={false}
              />
            </Space>
          ),
        },
        {
          key: "related",
          label: "关联资源",
          content: (
            <section>
              <TableSectionHeader
                title="关联资源"
                extra={
                  <Typography.Text type="secondary">{relatedResources.length} 个</Typography.Text>
                }
              />
              <DataTable<(typeof relatedResources)[number]>
                columns={relatedResourceColumns}
                data={relatedResources}
                loading={instances.isLoading}
                noDataElement={<Empty description="暂无关联资源" />}
                pagination={false}
                tableLabel="子网关联资源"
              />
            </section>
          ),
        },
      ]}
      onBack={() => navigate({ to: "/subnets" })}
    />
  );
}
