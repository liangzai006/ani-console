import { InferencePage } from '@/components/ai-services/InferencePage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/inference/')({
  component: InferencePage,
})
