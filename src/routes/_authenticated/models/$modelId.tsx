import { ModelDetailPage } from '@/components/ai-services/ModelDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/models/$modelId')({
  component: function ModelDetailRoute() {
    const { modelId } = Route.useParams()
    return <ModelDetailPage modelId={modelId} />
  },
})
