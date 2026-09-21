import { listNetworkRoutes, type NetworkRoute } from "@/api/network";
import { DataTable } from "@/components/common";
import { withId } from "@/lib/id";
import { Empty } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";

export function VpcRoutes({ vpcId }: { vpcId: string }) {
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
  const items = (routes.data?.items ?? []) as NetworkRoute[];

  return (
    <DataTable<NetworkRoute>
      columns={[
        { title: "目标 CIDR", dataIndex: "destination_cidr" },
        { title: "下一跳类型", dataIndex: "next_hop_type" },
        { title: "下一跳", dataIndex: "next_hop_id" },
        { title: "描述", dataIndex: "description", placeholder: "-" },
      ]}
      data={items}
      loading={routes.isLoading}
      pagination={false}
      noDataElement={<Empty />}
    />
  );
}
