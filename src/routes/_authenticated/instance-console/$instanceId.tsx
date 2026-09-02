import { InstanceConsolePage } from '@/components/instances/InstanceConsolePage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/instance-console/$instanceId')({
  component: function InstanceConsoleRoute() {
    const { instanceId } = Route.useParams()
    return <InstanceConsolePage instanceId={instanceId} />
  },
})
