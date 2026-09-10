import {
  DataTable,
  DetailPageFrame,
  DetailPagePlaceholder,
  AliIcon,
  StatusTag,
} from "@/components/common";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Empty, Modal, Spin } from "@arco-design/web-react";
import {
  deleteNetworkLoadBalancer,
  getNetworkLoadBalancer,
  getNetworkSubnet,
  getNetworkVpc,
  type NetworkLoadBalancer,
  type NetworkLoadBalancerListener,
  type NetworkSubnet,
  type NetworkVPC,
} from "@/api/network";
import { showApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";

type LoadBalancer = NetworkLoadBalancer;
type Listener = NetworkLoadBalancerListener;
type Vpc = NetworkVPC;
type Subnet = NetworkSubnet;

export function LoadBalancerDetailPage({ loadBalancerId }: { loadBalancerId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["network-load-balancer", loadBalancerId],
    queryFn: () => getNetworkLoadBalancer(loadBalancerId),
  });
  const vpc = useQuery({
    queryKey: ["network-vpc", detail.data?.vpc_id],
    queryFn: () => getNetworkVpc(detail.data!.vpc_id),
    enabled: Boolean(detail.data?.vpc_id),
  });
  const subnet = useQuery({
    queryKey: ["network-subnet", detail.data?.subnet_id],
    queryFn: () => getNetworkSubnet(detail.data!.subnet_id!),
    enabled: Boolean(detail.data?.subnet_id),
  });
  useListErrorNotification({
    id: `load-balancer-detail:${loadBalancerId}`,
    title: `负载均衡加载失败`,
    error: detail.error,
  });
  useListErrorNotification({
    id: `load-balancer-vpc:${loadBalancerId}`,
    title: `VPC 加载失败`,
    error: vpc.error,
  });
  useListErrorNotification({
    id: `load-balancer-subnet:${loadBalancerId}`,
    title: `子网加载失败`,
    error: subnet.error,
  });
  const remove = useMutation({
    mutationFn: (_: undefined) => deleteNetworkLoadBalancer(loadBalancerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network-load-balancers"] });
      navigate({ to: "/load-balancers" });
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
          { label: "负载均衡", to: "/load-balancers" },
          { label: loadBalancerId },
        ]}
        title={loadBalancerId}
        idLabel="负载均衡 ID"
        idValue={loadBalancerId}
      />
    );
  const item = detail.data as LoadBalancer;
  const parentVpc = vpc.data as Vpc | undefined;
  const parentSubnet = subnet.data as Subnet | undefined;
  const relatedLoading = vpc.isLoading || subnet.isLoading;
  const summaryItems = [
    ...(parentVpc
      ? [
          {
            id: parentVpc.id,
            kind: "VPC",
            name: parentVpc.name,
            type: "vpc" as const,
          },
        ]
      : []),
    ...(parentSubnet
      ? [
          {
            id: parentSubnet.id,
            kind: "子网",
            name: parentSubnet.name,
            type: "subnet" as const,
          },
        ]
      : []),
  ];
  const unavailable = (description: string) => <Empty description={description} />;
  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: "网络" },
        { label: "负载均衡", to: "/load-balancers" },
        { label: item.name },
      ]}
      title={item.name}
      status={<StatusTag status={item.state} />}
      icon={<AliIcon name="fuzaijunhengqi" size={28} />}
      headerItems={[
        { label: "负载均衡 ID", value: item.id },
        { label: "VIP", value: item.vip || "-" },
        { label: "创建时间", value: formatDateTime(item.created_at) },
      ]}
      actions={
        <Button
          status="danger"
          loading={remove.isPending}
          onClick={() =>
            Modal.confirm({
              title: "删除负载均衡",
              content: `确定删除「${item.name}」？`,
              okButtonProps: { status: "danger" },
              onOk: () => remove.mutateAsync(undefined),
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
            { label: "ID", value: item.id },
            { label: "名称", value: item.name },
            { label: "状态", value: <StatusTag status={item.state} /> },
            { label: "VIP", value: item.vip || "-" },
            {
              label: "类型",
              value: item.scheme === "public" ? "公网" : "私网",
            },
            { label: "VPC", value: parentVpc?.name ?? item.vpc_id },
            {
              label: "子网",
              value: parentSubnet?.name ?? item.subnet_id ?? "-",
            },
            { label: "创建时间", value: formatDateTime(item.created_at) },
            { label: "更新时间", value: formatDateTime(item.updated_at) },
          ],
        },
        {
          key: "related-summary",
          title: "关联摘要",
          fields: relatedLoading
            ? [{ label: "加载中…", value: "-" }]
            : summaryItems.length
              ? summaryItems.map((related) => ({
                  label: related.kind,
                  value: related.name,
                }))
              : [{ label: "暂无关联对象", value: "-" }],
        },
      ]}
      tabs={[
        {
          key: "listeners",
          label: "监听器",
          content: (
            <DataTable<Listener>
              columns={[
                {
                  title: "协议",
                  render: (_, row) => row.protocol.toUpperCase(),
                },
                { title: "监听端口", dataIndex: "port" },
                { title: "目标端口", dataIndex: "target_port" },
              ]}
              data={item.listeners}
              rowKey={(row) => `${row.protocol}-${row.port}-${row.target_port}`}
              pagination={false}
              noDataElement={<Empty description="暂无监听器" />}
            />
          ),
        },
        {
          key: "backends",
          label: "后端组",
          content: unavailable("当前 Core API 暂未提供后端组数据"),
        },
        {
          key: "metrics",
          label: "监控",
          content: unavailable("当前 Core API 暂未提供负载均衡监控数据"),
        },
        {
          key: "events",
          label: "事件",
          content: unavailable("当前 Core API 暂未提供负载均衡事件数据"),
        },
      ]}
      onBack={() => navigate({ to: "/load-balancers" })}
    />
  );
}
