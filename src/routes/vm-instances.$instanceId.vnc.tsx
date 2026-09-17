import { VmInstanceRemotePage } from "@/components/instances/VmInstanceRemotePage";
import { isAuthenticated } from "@/stores/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/vm-instances/$instanceId/vnc")({
  beforeLoad: () => {
    if (!isAuthenticated()) throw redirect({ to: "/login" });
  },
  component: function VmInstanceRemoteRoute() {
    const { instanceId } = Route.useParams();
    return <VmInstanceRemotePage instanceId={instanceId} />;
  },
});
