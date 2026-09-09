import { VpcDetailPage } from "@/components/network/VpcDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/vpcs/$vpcId")({
  component: function RouteComponent() {
    const { vpcId } = Route.useParams();
    return <VpcDetailPage vpcId={vpcId} />;
  },
});
