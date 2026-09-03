import { createFileRoute } from '@tanstack/react-router'
import { VmInstancesList } from '@/components/instances/VmInstancesList'

export const Route = createFileRoute('/_authenticated/vm-instances/')({
  component: VmInstancesList,
})
