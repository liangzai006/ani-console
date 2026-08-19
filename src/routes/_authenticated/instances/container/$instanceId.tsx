import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { ContainerInstanceDetailPage } from '@/views/container/detail'

export const Route = createFileRoute('/_authenticated/instances/container/$instanceId')({
  component: ContainerInstanceDetailRoute,
})

function ContainerInstanceDetailRoute() {
  const { instanceId } = Route.useParams()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname !== `/instances/container/${instanceId}`) return null
  return <ContainerInstanceDetailPage instanceId={instanceId} />
}
