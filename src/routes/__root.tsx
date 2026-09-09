import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useBranding } from "@/hooks/useBranding";
import { NotFoundPage } from "@/components/common";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: function RootComponent() {
    useBranding();
    return <Outlet />;
  },
  notFoundComponent: NotFoundPage,
});
