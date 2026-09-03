import { InstanceDetailPage } from '@/components/instances/ComputeInstanceDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/compute-instances/$instanceId')({
  component: function ComputeInstanceDetailRoute() {
    const { instanceId } = Route.useParams()
    return <InstanceDetailPage instanceId={instanceId} />
  },
})
