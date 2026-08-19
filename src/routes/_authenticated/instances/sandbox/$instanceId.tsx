import { createFileRoute } from '@tanstack/react-router'
import { InstanceDetailContent } from '../$instanceId'

export const Route = createFileRoute('/_authenticated/instances/sandbox/$instanceId')({
  component: SandboxInstanceDetailPage,
})

function SandboxInstanceDetailPage() {
  const { instanceId } = Route.useParams()
  return <InstanceDetailContent instanceId={instanceId} returnTo="/instances/sandbox" />
}
