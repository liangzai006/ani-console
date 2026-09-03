import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  SandboxInstanceDetailPage,
} from "@/components/instances/SandboxInstanceDetailPage";
import {
  sandboxInstanceDetailTabKeys,
  type SandboxInstanceDetailTabKey,
} from "@/lib/instance-detail-tabs";

export const Route = createFileRoute(
  "/_authenticated/sandbox-instances/$instanceId",
)({
  validateSearch: (search: Record<string, unknown>): { tab?: SandboxInstanceDetailTabKey } => ({
    tab: sandboxInstanceDetailTabKeys.includes(search.tab as SandboxInstanceDetailTabKey)
      ? (search.tab as SandboxInstanceDetailTabKey)
      : undefined,
  }),
  component: function SandboxInstanceDetailRoute() {
    const { instanceId } = Route.useParams();
    const { tab = "overview" } = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    return (
      <SandboxInstanceDetailPage
        instanceId={instanceId}
        tab={tab}
        onTabChange={(nextTab) => navigate({ search: { tab: nextTab }, replace: true })}
      />
    );
  },
});
