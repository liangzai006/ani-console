import { VolumeDetailPage } from '@/components/storage/VolumeDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/volumes/$volumeId')({
  component: function VolumeDetailRoute() {
    const { volumeId } = Route.useParams()
    return <VolumeDetailPage volumeId={volumeId} />
  },
})
