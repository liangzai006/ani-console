import { InferencePoliciesPage } from '@/components/ai-services/InferencePoliciesPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/inference/policies')({
  component: InferencePoliciesPage,
})
