import { GpuInstanceTerminalPage } from "@/components/instances/GpuInstanceTerminalPage";
import { isAuthenticated } from "@/stores/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/gpu-instances/$instanceId/terminal")({
  beforeLoad: () => {
    if (!isAuthenticated()) throw redirect({ to: "/login" });
  },
  component: function GpuInstanceTerminalRoute() {
    const { instanceId } = Route.useParams();
    return <GpuInstanceTerminalPage instanceId={instanceId} />;
  },
});
