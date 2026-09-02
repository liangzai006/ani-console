import { createFileRoute } from '@tanstack/react-router'
import { ContainerInstanceCreatePage } from '@/components/container-instances/ContainerInstanceCreate'

export const Route = createFileRoute('/_authenticated/container-instances/create')({
  component: ContainerInstanceCreatePage,
})
