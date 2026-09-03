import { GpuInstancesPage } from '@/components/instances/GpuInstancesPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/gpu-instances/')({
  component: GpuInstancesPage,
})
