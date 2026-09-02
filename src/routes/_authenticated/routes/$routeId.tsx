import { NetworkRouteDetailPage } from '@/components/network/NetworkRouteDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/routes/$routeId')({
  component: function NetworkRouteDetailRoute() {
    const { routeId } = Route.useParams()
    return <NetworkRouteDetailPage routeId={routeId} />
  },
})
