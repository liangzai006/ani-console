import { createFileRoute } from '@tanstack/react-router'
import { VmVolumeDetailPage } from '@/views/vm/detail'

export const Route = createFileRoute('/_authenticated/instances/vm/$instanceId/volumes/$volumeId')({
  component: VmVolumeDetailRoute,
})

function VmVolumeDetailRoute() {
  const { instanceId, volumeId } = Route.useParams()
  return <VmVolumeDetailPage instanceId={instanceId} volumeId={volumeId} />
}
