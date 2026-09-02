import { createFileRoute } from "@tanstack/react-router";
import { GpuInstanceDetail } from "@/components/gpu-instances/GpuInstanceDetail";

export const Route = createFileRoute(
  "/_authenticated/gpu-instances/$instanceId",
)({
  component: function GpuInstanceDetailRoute() {
    const { instanceId } = Route.useParams();

    return <GpuInstanceDetail instanceId={instanceId} />;
  },
});
