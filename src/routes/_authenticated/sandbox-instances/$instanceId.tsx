import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SandboxInstanceDetailPage } from "@/components/instances/SandboxInstanceDetailPage";
import { sandboxInstanceDetailTabKeys, type SandboxInstanceDetailTabKey } from "@/lib/instances";

export const Route = createFileRoute("/_authenticated/sandbox-instances/$instanceId")({
  validateSearch: (search: Record<string, unknown>): { tab?: SandboxInstanceDetailTabKey } => {
    const tab = search.tab === "security" ? "events" : search.tab;
    return {
      tab: sandboxInstanceDetailTabKeys.includes(tab as SandboxInstanceDetailTabKey)
        ? (tab as SandboxInstanceDetailTabKey)
        : undefined,
    };
  },
  component: function SandboxInstanceDetailRoute() {
    const { instanceId } = Route.useParams();
    const { tab = "access" } = Route.useSearch();
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
