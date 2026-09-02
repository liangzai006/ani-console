import { createFileRoute } from '@tanstack/react-router'
import { VmInstancesList } from '@/components/vm-instances/VmInstancesList'

export const Route = createFileRoute('/_authenticated/vm-instances/')({
  component: VmInstancesList,
})
