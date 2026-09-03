import {
  DataTable,
  DetailPageFrame,
  DetailPagePlaceholder,
  AliIcon,
  StatusTag,
} from "@/components/common";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Empty,
  List,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
} from "@arco-design/web-react";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { formatDateTime } from "@/lib/format";
import { listOrThrow } from "@/lib/api-list";
import { navigateToInstanceDetail } from "@/lib/instance-detail-route";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";

type Subnet = components["schemas"]["NetworkSubnet"];
type Vpc = components["schemas"]["NetworkVPC"];
type Instance = components["schemas"]["InstanceRecord"];
type NetworkRoute = components["schemas"]["NetworkRoute"];
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
    queryKey: ["network-subnet", subnetId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET(
        "/networks/subnets/{subnet_id}",
        {
          params: { path: { subnet_id: subnetId } },
        },
      );
      if (error) throw error;
      return data;
    },
  });
  const vpc = useQuery({
    queryKey: ["network-vpc", detail.data?.vpc_id],
    queryFn: async () => {
      const { data, error } = await coreApi.GET("/networks/vpcs/{vpc_id}", {
        params: { path: { vpc_id: detail.data!.vpc_id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(detail.data?.vpc_id),
  });
  const instances = useQuery({
    queryKey: ["instances", "subnet", subnetId],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/instances", {
          params: {
            query: asUncontractedQuery({ limit: 100, subnet_id: subnetId }),
          },
        }),
      ),
  });
  const routes = useQuery({
    queryKey: ["network-routes", "subnet-vpc", detail.data?.vpc_id],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/routes", {
          params: { query: { vpc_id: detail.data!.vpc_id, limit: 100 } },
        }),
      ),
    enabled: Boolean(detail.data?.vpc_id),
  });
  useListErrorNotification({
    id: `subnet-detail:${subnetId}`,
    title: `子网加载失败`,
    error: detail.error,
  });
  useListErrorNotification({
    id: `subnet-vpc:${subnetId}`,
    title: `VPC 加载失败`,
    error: vpc.error,
  });
  useListErrorNotification({
    id: `subnet-instances:${subnetId}`,
    title: `关联实例加载失败`,
    error: instances.error,
  });
  useListErrorNotification({
    id: `subnet-routes:${subnetId}`,
    title: `路由加载失败`,
    error: routes.error,
  });
  const deleteSubnet = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.DELETE("/networks/subnets/{subnet_id}", {
        params: { path: { subnet_id: subnetId } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network-subnets"] });
      navigate({ to: "/subnets" });
    },
    onError: (error) => showApiError(error),
  });

  if (detail.isLoading && !detail.data)
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    );
  if (!detail.data)
    return (
      <DetailPagePlaceholder
        breadcrumbs={[
          { label: "网络" },
          { label: "子网", to: "/subnets" },
          { label: subnetId },
        ]}
        title={subnetId}
        idLabel="子网 ID"
        idValue={subnetId}
      />
    );

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
        item.next_hop_type === "instance"
          ? "实例"
          : item.next_hop_type === "nat"
            ? "NAT"
            : "网关",
      nextHop: item.next_hop_id,
      priority: item.next_hop_type === "instance" ? 150 : 200,
      source: "自定义" as const,
      protected: false,
    })),
  ];
  const relatedLoading =
    vpc.isLoading || instances.isLoading || routes.isLoading;
  const summaryItems = [
    ...(parentVpc
      ? [
          {
            id: parentVpc.id,
            kind: "VPC",
            name: parentVpc.name,
            status: parentVpc.state,
            type: "vpc" as const,
          },
        ]
      : []),
    ...vpcRoutes.map((item) => ({
      id: item.id,
      kind: "路由",
      name: item.description || item.destination_cidr,
      status: "-",
      type: "route" as const,
    })),
    ...associatedInstances.map((item) => ({
      id: item.id,
      kind: "实例",
      name: item.name,
      status: item.state,
      type: "instance" as const,
    })),
  ];
  const relatedResources = summaryItems.filter(
    (item) => item.type === "instance",
  );
  const openRelated = (item: (typeof summaryItems)[number]) => {
    if (item.type === "vpc")
      navigate({ to: "/vpcs/$vpcId", params: { vpcId: item.id } });
    else if (item.type === "route") navigate({ to: "/routes" });
    else {
      const instance = associatedInstances.find(
        (candidate) => candidate.id === item.id,
      );
      if (instance) navigateToInstanceDetail(navigate, instance);
    }
  };

  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: "网络" },
        { label: "子网", to: "/subnets" },
        { label: subnet.name },
      ]}
      title={subnet.name}
      status={<StatusTag status={subnet.state} />}
      icon={<AliIcon name="VPCwangluo" size={28} />}
      headerItems={[
        { label: "子网 ID", value: subnet.id },
        { label: "CIDR", value: subnet.cidr },
        { label: "创建时间", value: formatDateTime(subnet.created_at) },
      ]}
      actions={
        <Space>
          <Button
            status="danger"
            loading={deleteSubnet.isPending}
            onClick={() =>
              Modal.confirm({
                title: "删除子网",
                content:
                  "确定删除「${subnet.name}」？存在关联实例时无法删除，请先清理相关资源。",
                okButtonProps: { status: "danger" },
                onOk: () => deleteSubnet.mutateAsync(undefined),
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
            { label: "ID", value: subnet.id },
            { label: "名称", value: subnet.name },
            {
              label: "VPC",
              value:
                parentVpc?.name ?? (vpc.isLoading ? "加载中…" : subnet.vpc_id),
            },
            { label: "CIDR", value: subnet.cidr },
            { label: "网关", value: subnet.gateway ?? "-" },
            { label: "状态", value: <StatusTag status={subnet.state} /> },
            { label: "创建时间", value: formatDateTime(subnet.created_at) },
            { label: "更新时间", value: formatDateTime(subnet.updated_at) },
          ],
        },
        {
          key: "related-summary",
          title: "关联摘要",
          fields: relatedLoading
            ? [{ label: "加载中…", value: "-" }]
            : summaryItems.length
              ? summaryItems.slice(0, 5).map((item) => ({
                  label: `${item.kind} · ${item.name}`,
                  value: (
                    <Button
                      type="text"
                      size="mini"
                      onClick={() => openRelated(item)}
                    >
                      打开
                    </Button>
                  ),
                }))
              : [{ label: "暂无关联对象", value: "-" }],
        },
      ]}
      tabs={[
        {
          key: "related",
          label: "关联资源",
          content: (
            <Space direction="vertical" size={12} className="w-full">
              <Typography.Text>
                共{" "}
                <Typography.Text bold>
                  {relatedResources.length}
                </Typography.Text>{" "}
                个关联对象
              </Typography.Text>
              <Card title={`关联资源 ${relatedResources.length}`} size="small">
                <List
                  loading={instances.isLoading}
                  dataSource={relatedResources}
                  noDataElement={<Empty description="暂无关联资源" />}
                  render={(item) => (
                    <div className="flex w-full items-center gap-3 px-5 py-3">
                      <Tag className="shrink-0">{item.kind}</Tag>
                      <span className="min-w-0 flex-1 truncate">
                        {item.name}
                      </span>
                      <Typography.Text className="shrink-0" type="secondary">
                        {item.id}
                      </Typography.Text>
                      <StatusTag status={item.status} />
                      <Button
                        className="shrink-0"
                        type="text"
                        size="mini"
                        onClick={() => openRelated(item)}
                      >
                        打开
                      </Button>
                    </div>
                  )}
                />
              </Card>
            </Space>
          ),
        },
        {
          key: "routes",
          label: "路由",
          content: (
            <Space direction="vertical" size={12} className="w-full">
              <Alert
                type="info"
                showIcon={false}
                content="本 VPC 路由表。系统默认路由不可删；自定义路由也可在侧栏「路由」维护。"
              />
              <DataTable<SubnetRouteRow>
                columns={[
                  { title: "目标网段", dataIndex: "destinationCidr" },
                  { title: "下一跳类型", dataIndex: "nextHopType" },
                  { title: "下一跳", dataIndex: "nextHop" },
                  { title: "优先级", dataIndex: "priority" },
                  { title: "来源", dataIndex: "source" },
                  {
                    title: "操作",
                    render: (_, item) =>
                      item.protected ? (
                        <Typography.Text type="secondary">
                          受保护
                        </Typography.Text>
                      ) : (
                        <Button
                          type="text"
                          size="mini"
                          onClick={() => navigate({ to: "/routes" })}
                        >
                          打开
                        </Button>
                      ),
                  },
                ]}
                data={routeRows}
                loading={routes.isLoading}
                pagination={false}
              />
            </Space>
          ),
        },
      ]}
      onBack={() => navigate({ to: "/subnets" })}
    />
  );
}
