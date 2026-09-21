import { getK8sClusterKubeconfig } from "@/api/k8s-clusters";
import { downloadBlob } from "@/lib/browser";
import { Button } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";

export function K8sKubeconfig({ clusterId }: { clusterId: string }) {
  const download = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "kubeconfig-download",
        action: "操作",
        errorFallback: "下载失败",
      },
    },
    mutationFn: async () => {
      const data = await getK8sClusterKubeconfig(clusterId);
      const blob = new Blob([data.kubeconfig ?? ""], { type: "text/yaml" });
      downloadBlob(blob, `kubeconfig-${clusterId}.yaml`);
    },
  });

  return (
    <Button type="primary" loading={download.isPending} onClick={() => download.mutate()}>
      下载 Kubeconfig
    </Button>
  );
}
