import { RegistryPage } from '@/components/registry/RegistryPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/registry/')({
  component: RegistryPage,
})
