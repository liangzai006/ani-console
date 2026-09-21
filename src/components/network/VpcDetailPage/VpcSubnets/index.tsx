import { listNetworkSubnets, type NetworkSubnet } from "@/api/network";
import { DataTable, StatusTag } from "@/components/common";
import { withId } from "@/lib/id";
import { useQuery } from "@tanstack/react-query";

export function VpcSubnets({ vpcId }: { vpcId: string }) {
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
  const items = (subnets.data?.items ?? []) as NetworkSubnet[];

  return (
    <DataTable<NetworkSubnet>
      columns={[
        { title: "名称", dataIndex: "name" },
        { title: "CIDR", dataIndex: "cidr" },
        { title: "网关", dataIndex: "gateway", placeholder: "-" },
        {
          title: "状态",
          width: 120,
          render: (_, item) => <StatusTag status={item.state} />,
        },
      ]}
      data={items}
      loading={subnets.isLoading}
      pagination={false}
      noDataElement="当前 VPC 暂无子网"
    />
  );
}
