import { SubnetDetailPage } from "@/components/network/SubnetDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/subnets/$subnetId")({
  component: function SubnetDetailRoute() {
    const { subnetId } = Route.useParams();
    return <SubnetDetailPage subnetId={subnetId} />;
  },
});
