import { ModelsPage } from '@/components/ai-services/ModelsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/models/')({
  component: ModelsPage,
})
