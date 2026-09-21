import { K8sClusterDetailPage } from "@/components/k8s-clusters/K8sClusterDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/k8s-clusters/$clusterId")({
  component: function K8sClusterDetailRoute() {
    const { clusterId } = Route.useParams();
    return <K8sClusterDetailPage clusterId={clusterId} />;
  },
});
