import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { ContainerInstancesPage as ContainerInstancesListPage } from '@/views/container/ContainerInstancesPage'

export const Route = createFileRoute('/_authenticated/instances/container')({
  component: ContainerInstancesPage,
})

function ContainerInstancesPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname !== '/instances/container') return <Outlet />
  return <ContainerInstancesListPage />
}
