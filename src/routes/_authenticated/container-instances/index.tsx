import { createFileRoute } from '@tanstack/react-router'
import { ContainerInstancesPage as ContainerInstancesListPage } from '@/components/instances/ContainerInstancesList'

export const Route = createFileRoute('/_authenticated/container-instances/')({
  component: ContainerInstancesListPage,
})
