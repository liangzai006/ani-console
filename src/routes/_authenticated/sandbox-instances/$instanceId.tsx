import { createFileRoute } from "@tanstack/react-router";
import { SandboxInstanceDetailPage as SandboxInstanceDetailContent } from "@/components/instances/SandboxInstanceDetailPage";

export const Route = createFileRoute(
  "/_authenticated/sandbox-instances/$instanceId",
)({
  component: function SandboxInstanceDetailPage() {
    const { instanceId } = Route.useParams();
    return <SandboxInstanceDetailContent instanceId={instanceId} />;
  },
});
