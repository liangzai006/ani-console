import { InstanceTerminalPage } from '@/components/instances/InstanceTerminalPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/instance-terminal/$instanceId')({
  component: function InstanceTerminalRoute() {
    const { instanceId } = Route.useParams()
    return <InstanceTerminalPage instanceId={instanceId} />
  },
})
