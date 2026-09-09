import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ClusterDetail } from "@/components/k8s-clusters/K8sClustersPage";

export const Route = createFileRoute("/_authenticated/k8s-clusters/$clusterId")({
  component: function K8sClusterDetailRoute() {
    const { clusterId } = Route.useParams();
    const navigate = useNavigate();

    return <ClusterDetail clusterId={clusterId} onBack={() => navigate({ to: "/k8s-clusters" })} />;
  },
});
