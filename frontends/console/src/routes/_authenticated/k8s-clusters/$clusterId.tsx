import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ClusterDetail } from './index'

export const Route = createFileRoute('/_authenticated/k8s-clusters/$clusterId')({
  component: K8sClusterDetailRoute,
})

function K8sClusterDetailRoute() {
  const { clusterId } = Route.useParams()
  const navigate = useNavigate()

  return <ClusterDetail clusterId={clusterId} onBack={() => navigate({ to: '/k8s-clusters' })} />
}
