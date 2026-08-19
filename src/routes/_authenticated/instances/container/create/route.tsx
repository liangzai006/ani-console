import { createFileRoute } from '@tanstack/react-router'
import { ContainerInstanceCreatePage } from '@/views/container/ContainerCreatePage'

export const Route = createFileRoute('/_authenticated/instances/container/create')({
  component: ContainerInstanceCreatePage,
})