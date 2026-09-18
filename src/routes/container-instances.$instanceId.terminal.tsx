import { ContainerInstanceTerminalPage } from "@/components/instances/ContainerInstanceTerminalPage";
import { isAuthenticated } from "@/stores/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/container-instances/$instanceId/terminal")({
  beforeLoad: () => {
    if (!isAuthenticated()) throw redirect({ to: "/login" });
  },
  component: function ContainerInstanceTerminalRoute() {
    const { instanceId } = Route.useParams();
    return <ContainerInstanceTerminalPage instanceId={instanceId} />;
  },
});
