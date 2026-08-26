import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { useBranding } from '@/hooks/useBranding'
import { NotFoundPage } from '@/components/common/NotFoundPage'

export interface RouterContext {
  queryClient: QueryClient
}

function RootComponent() {
  useBranding()
  return <Outlet />
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
})
