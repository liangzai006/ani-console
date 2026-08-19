import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { VmInstancesPage as VmInstancesListPage } from '@/views/vm/VmInstancesPage'

export const Route = createFileRoute('/_authenticated/instances/vm')({
  component: VmInstancesPage,
})

function VmInstancesPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname !== '/instances/vm') return <Outlet />
  return <VmInstancesListPage />
}
