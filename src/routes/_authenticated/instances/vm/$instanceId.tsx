import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { InstanceDetailContent } from '../$instanceId'
import { getSharedVmInstance } from '@/views/vm/data-source'
import { VmInstanceDetailPage } from '@/views/vm/detail'

export const Route = createFileRoute('/_authenticated/instances/vm/$instanceId')({
  component: VmInstanceDetailRoute,
})

function VmInstanceDetailRoute() {
  const { instanceId } = Route.useParams()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname !== `/instances/vm/${instanceId}`) return <Outlet />
  if (!getSharedVmInstance(instanceId)) {
    return <InstanceDetailContent instanceId={instanceId} returnTo="/instances/vm" />
  }
  return <VmInstanceDetailPage instanceId={instanceId} />
}
