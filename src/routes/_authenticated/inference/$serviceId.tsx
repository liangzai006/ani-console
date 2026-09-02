import { InferenceDetailPage } from '@/components/ai-services/InferenceDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/inference/$serviceId')({
  component: function InferenceDetailRoute() {
    const { serviceId } = Route.useParams()
    return <InferenceDetailPage serviceId={serviceId} />
  },
})
