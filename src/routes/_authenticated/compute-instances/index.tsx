import { InstancesListPage } from '@/components/compute-instances/ComputeInstancesPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/compute-instances/')({
  component: InstancesListPage,
})
