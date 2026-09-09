import { SecurityGroupDetailPage } from "@/components/network/SecurityGroupDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/security-groups/$securityGroupId")({
  component: function SecurityGroupDetailRoute() {
    const { securityGroupId } = Route.useParams();
    return <SecurityGroupDetailPage securityGroupId={securityGroupId} />;
  },
});
