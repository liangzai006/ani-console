import { listNetworkRoutes, type NetworkRoute } from "@/api/network";
import { DataTable } from "@/components/common";
import { withId } from "@/lib/id";
import { Space } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";

type SubnetRouteRow = {
  id: string;
  destinationCidr: string;
  nextHopType: string;
  nextHop: string;
  priority: number;
  source: "系统" | "自定义";
};

export function SubnetRoutes({ subnetId, vpcId }: { subnetId: string; vpcId: string }) {
  const routes = useQuery({
    meta: {
      errorNotification: {
        id: withId("subnet-routes", subnetId),
        action: "路由加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-routes", "subnet-vpc", vpcId],
    queryFn: () => listNetworkRoutes({ vpc_id: vpcId, limit: 100 }),
  });
  const routeRows: SubnetRouteRow[] = [
    {
      id: "system-default",
      destinationCidr: "0.0.0.0/0",
      nextHopType: "本地",
      nextHop: "本地",
      priority: 100,
      source: "系统",
    },
    ...((routes.data?.items ?? []) as NetworkRoute[]).map((item) => ({
      id: item.id,
      destinationCidr: item.destination_cidr,
      nextHopType:
        item.next_hop_type === "instance" ? "实例" : item.next_hop_type === "nat" ? "NAT" : "网关",
      nextHop: item.next_hop_id,
      priority: item.next_hop_type === "instance" ? 150 : 200,
      source: "自定义" as const,
    })),
  ];

  return (
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
  );
}
