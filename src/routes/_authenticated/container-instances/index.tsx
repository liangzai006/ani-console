import { createFileRoute } from '@tanstack/react-router'
import { ContainerInstancesPage as ContainerInstancesListPage } from '@/components/container-instances/ContainerInstancesList'

export const Route = createFileRoute('/_authenticated/container-instances/')({
  component: ContainerInstancesListPage,
})
