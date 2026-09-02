import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { ContainerInstanceDetailPage } from '@/components/container-instances/ContainerInstanceDetail'

export const Route = createFileRoute('/_authenticated/container-instances/$instanceId')({
  component: function ContainerInstanceDetailRoute() {
    const { instanceId } = Route.useParams()
    const pathname = useRouterState({ select: (state) => state.location.pathname })
    if (pathname !== `/container-instances/${instanceId}`) return null
    return <ContainerInstanceDetailPage instanceId={instanceId} />
  },
})
