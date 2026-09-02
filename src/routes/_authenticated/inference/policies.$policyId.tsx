import { InferencePolicyDetailPage } from '@/components/ai-services/InferencePolicyDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/inference/policies/$policyId')({
  component: function InferencePolicyDetailRoute() {
    const { policyId } = Route.useParams()
    return <InferencePolicyDetailPage policyId={policyId} />
  },
})
