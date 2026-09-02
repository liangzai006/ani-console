import { LoadBalancerDetailPage } from '@/components/network/LoadBalancerDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/load-balancers/$loadBalancerId')({
  component: function LoadBalancerDetailRoute() {
    const { loadBalancerId } = Route.useParams()
    return <LoadBalancerDetailPage loadBalancerId={loadBalancerId} />
  },
})
