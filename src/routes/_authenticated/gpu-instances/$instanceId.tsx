import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  GpuInstanceDetailPage,
} from "@/components/instances/GpuInstanceDetailPage";
import {
  gpuInstanceDetailTabKeys,
  type GpuInstanceDetailTabKey,
} from "@/lib/instance-detail-tabs";

export const Route = createFileRoute(
  "/_authenticated/gpu-instances/$instanceId",
)({
  validateSearch: (search: Record<string, unknown>): { tab?: GpuInstanceDetailTabKey } => ({
    tab: gpuInstanceDetailTabKeys.includes(search.tab as GpuInstanceDetailTabKey)
      ? (search.tab as GpuInstanceDetailTabKey)
      : undefined,
  }),
  component: function GpuInstanceDetailRoute() {
    const { instanceId } = Route.useParams();
    const { tab = "releases" } = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });

    return (
      <GpuInstanceDetailPage
        instanceId={instanceId}
        tab={tab}
        onTabChange={(nextTab) => navigate({ search: { tab: nextTab }, replace: true })}
      />
    );
  },
});
