import { deleteK8sCluster, getK8sCluster } from "@/api/k8s-clusters";
import {
  AliIcon,
  DetailPageFrame,
  DetailPagePlaceholder,
  ResourceId,
  StatusTag,
} from "@/components/common";
import { formatDateTime } from "@/lib/format";
import { withId } from "@/lib/id";
import { Button, Modal } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { navigationBreadcrumbsForPath } from "@/components/layouts/AppLayout/navigation";
import { K8sEvents } from "./K8sEvents";
import { K8sKubeconfig } from "./K8sKubeconfig";
import { K8sNodePools } from "./K8sNodePools";
import { K8sWorkloads } from "./K8sWorkloads";

export function K8sClusterDetailPage({ clusterId }: { clusterId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [nodeCount, setNodeCount] = useState(0);
  const handleNodeCountChange = useCallback((count: number) => setNodeCount(count), []);
  const detail = useQuery({
    meta: {
      errorNotification: {
        id: withId("k8s-cluster", clusterId),
        action: "K8s 集群加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["k8s-cluster", clusterId],
    queryFn: () => getK8sCluster(clusterId),
  });
  const deleteCluster = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "k8s-cluster-delete",
        action: "删除",
        errorFallback: "操作失败",
      },
    },
    mutationFn: () => deleteK8sCluster(clusterId),
    onSuccess: () => {
      navigate({ to: "/k8s-clusters" });
      void qc.invalidateQueries({ queryKey: ["k8s-clusters"] });
    },
  });

  if (!detail.data) return <DetailPagePlaceholder loading={detail.isLoading} />;

  const cluster = detail.data;

  return (
    <DetailPageFrame
      breadcrumbs={[
        ...navigationBreadcrumbsForPath("/k8s-clusters"),
        { label: cluster.name ?? clusterId },
      ]}
      icon={<AliIcon name="jiqun" size={28} />}
      title={cluster.name ?? clusterId}
      status={<StatusTag status={cluster.state} />}
      headerItems={[
        { label: "区域", value: "-" },
        { label: "K8s 版本", value: cluster.version ?? "-" },
        { label: "节点数", value: String(nodeCount) },
      ]}
      actions={
        <Button
          type="outline"
          status="danger"
          onClick={() =>
            void Modal.confirm({
              title: "删除集群",
              content: `确定删除「${cluster.name ?? clusterId}」？此操作不可恢复。`,
              onOk: () => deleteCluster.mutateAsync(),
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
            { label: "ID", value: <ResourceId value={cluster.id ?? clusterId} /> },
            { label: "状态", value: <StatusTag status={cluster.state} /> },
            { label: "区域", value: "-" },
            { label: "K8s 版本", value: cluster.version ?? "-" },
            { label: "节点数", value: nodeCount },
            { label: "创建时间", value: formatDateTime(cluster.created_at) },
            { label: "关联对象", value: "1 个" },
          ],
        },
        {
          key: "related",
          title: "关联摘要",
          fields: [{ label: "关联对象", value: "1 个" }],
          defaultCollapsed: true,
        },
      ]}
      tabs={[
        {
          key: "nodes",
          label: "节点",
          content: <K8sNodePools clusterId={clusterId} onNodeCountChange={handleNodeCountChange} />,
        },
        {
          key: "workloads",
          label: "工作负载",
          content: <K8sWorkloads clusterId={clusterId} />,
        },
        {
          key: "kubeconfig",
          label: "kubeconfig",
          content: <K8sKubeconfig clusterId={clusterId} />,
        },
        { key: "events", label: "事件", content: <K8sEvents /> },
      ]}
      onBack={() => navigate({ to: "/k8s-clusters" })}
    />
  );
}
