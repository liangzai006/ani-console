import { createFileRoute } from '@tanstack/react-router'
import { InstanceDetailContent } from '@/components/compute-instances/ComputeInstanceDetailPage'

export const Route = createFileRoute('/_authenticated/sandbox-instances/$instanceId')({
  component: function SandboxInstanceDetailPage() {
    const { instanceId } = Route.useParams()
    return <InstanceDetailContent instanceId={instanceId} returnTo="/sandbox-instances" />
  },
})
