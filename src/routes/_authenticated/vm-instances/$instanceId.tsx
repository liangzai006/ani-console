import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { VmInstanceDetailPage } from "@/components/instances/VmInstanceDetailPage";
import {
  computeInstanceDetailTabKeys,
  type ComputeInstanceDetailTabKey,
} from "@/lib/instance-detail-tabs";

export const Route = createFileRoute("/_authenticated/vm-instances/$instanceId")({
  validateSearch: (search: Record<string, unknown>): { tab?: ComputeInstanceDetailTabKey } => ({
    tab: computeInstanceDetailTabKeys.includes(search.tab as ComputeInstanceDetailTabKey)
      ? (search.tab as ComputeInstanceDetailTabKey)
      : undefined,
  }),
  component: function VmInstanceDetailRoute() {
    const { instanceId } = Route.useParams();
    const { tab = "ssh" } = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    const pathname = useRouterState({
      select: (state) => state.location.pathname,
    });
    if (pathname !== `/vm-instances/${instanceId}`) return <Outlet />;
    return (
      <VmInstanceDetailPage
        instanceId={instanceId}
        tab={tab}
        onTabChange={(nextTab) => navigate({ search: { tab: nextTab }, replace: true })}
      />
    );
  },
});
