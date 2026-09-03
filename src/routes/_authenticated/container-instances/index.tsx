import { createFileRoute } from '@tanstack/react-router'
import { ContainerInstancesPage } from '@/components/instances/ContainerInstancesPage'

export const Route = createFileRoute('/_authenticated/container-instances/')({
  component: ContainerInstancesPage,
})
