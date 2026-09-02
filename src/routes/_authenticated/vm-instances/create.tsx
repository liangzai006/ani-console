import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { VmInstanceCreateModal } from '@/components/vm-instances/VmInstanceCreateModal'

export const Route = createFileRoute('/_authenticated/vm-instances/create')({
  component: function VmInstanceCreatePage() {
    const navigate = useNavigate()
    const close = () => navigate({ to: '/vm-instances' })

    return <VmInstanceCreateModal visible onCancel={close} onCreated={close} />
  },
})
