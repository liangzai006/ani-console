import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { InstanceDetailContent } from '@/components/instances/ComputeInstanceDetailPage'

export const Route = createFileRoute('/_authenticated/vm-instances/$instanceId')({
  component: function VmInstanceDetailRoute() {
    const { instanceId } = Route.useParams()
    const pathname = useRouterState({ select: (state) => state.location.pathname })
    if (pathname !== `/vm-instances/${instanceId}`) return <Outlet />
    return <InstanceDetailContent instanceId={instanceId} returnTo="/vm-instances" />
  },
})
