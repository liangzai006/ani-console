import { SandboxTemplatesPage } from '@/components/sandbox-templates/SandboxTemplatesPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/sandbox-templates/')({
  component: SandboxTemplatesPage,
})
