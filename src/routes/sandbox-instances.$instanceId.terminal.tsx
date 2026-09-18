import { SandboxInstanceTerminalPage } from "@/components/instances/SandboxInstanceTerminalPage";
import { isAuthenticated } from "@/stores/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/sandbox-instances/$instanceId/terminal")({
  beforeLoad: () => {
    if (!isAuthenticated()) throw redirect({ to: "/login" });
  },
  component: function SandboxInstanceTerminalRoute() {
    const { instanceId } = Route.useParams();
    return <SandboxInstanceTerminalPage instanceId={instanceId} />;
  },
});
