import { listK8sClusterNodePools, type K8sClusterNodePool } from "@/api/k8s-clusters";
import { DataTable, StatusTag } from "@/components/common";
import { withId } from "@/lib/id";
import { Empty } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function K8sNodePools({
  clusterId,
  onNodeCountChange,
}: {
  clusterId: string;
  onNodeCountChange: (count: number) => void;
}) {
  const nodePools = useQuery({
    meta: {
      errorNotification: {
        id: withId("k8s-node-pools", clusterId),
        action: "节点池加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["k8s-node-pools", clusterId],
    queryFn: () => listK8sClusterNodePools(clusterId),
  });
  const items = (nodePools.data?.items ?? []) as K8sClusterNodePool[];
  const nodeCount = items.reduce((total, pool) => total + Number(pool.node_count ?? 0), 0);

  useEffect(() => {
    onNodeCountChange(nodeCount);
  }, [nodeCount, onNodeCountChange]);

  return (
    <DataTable<K8sClusterNodePool>
      columns={[
        { title: "名称", dataIndex: "name" },
        { title: "规格", dataIndex: "instance_type" },
        {
          title: "状态",
          width: 120,
          render: (_, row) => <StatusTag status={row.state} />,
        },
      ]}
      data={items}
      loading={nodePools.isLoading}
      pagination={false}
      noDataElement={<Empty description="暂无节点池，点击上方创建" />}
    />
  );
}
