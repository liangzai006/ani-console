import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { ContainerInstanceDetailPage } from "@/components/instances/ContainerInstanceDetailPage";
import {
  containerInstanceDetailTabKeys,
  type ContainerInstanceDetailTabKey,
} from "@/lib/instance-detail-tabs";

export const Route = createFileRoute("/_authenticated/container-instances/$instanceId")({
  validateSearch: (search: Record<string, unknown>): { tab?: ContainerInstanceDetailTabKey } => ({
    tab: containerInstanceDetailTabKeys.includes(search.tab as ContainerInstanceDetailTabKey)
      ? (search.tab as ContainerInstanceDetailTabKey)
      : undefined,
  }),
  component: function ContainerInstanceDetailRoute() {
    const { instanceId } = Route.useParams();
    const { tab = "release" } = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    if (pathname !== `/container-instances/${instanceId}`) return null;
    return (
      <ContainerInstanceDetailPage
        instanceId={instanceId}
        tab={tab}
        onTabChange={(nextTab) => navigate({ search: { tab: nextTab }, replace: true })}
      />
    );
  },
});
