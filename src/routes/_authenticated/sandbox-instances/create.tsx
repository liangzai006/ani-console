import { SandboxInstanceCreatePage } from '@/components/sandbox-instances/SandboxInstanceCreatePage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/sandbox-instances/create')({
  validateSearch: (search: Record<string, unknown>) => ({
    template_id: typeof search.template_id === 'string' ? search.template_id : undefined,
  }),
  component: function SandboxInstanceCreateRoute() {
    const { template_id: templateId } = Route.useSearch()
    return <SandboxInstanceCreatePage templateId={templateId} />
  },
})
