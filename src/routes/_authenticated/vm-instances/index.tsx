import { createFileRoute } from '@tanstack/react-router'
import { VmInstancesPage } from '@/components/instances/VmInstancesPage'

export const Route = createFileRoute('/_authenticated/vm-instances/')({
  component: VmInstancesPage,
})
