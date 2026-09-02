import { GpuInstancesPage } from '@/components/gpu-instances/GpuInstancesPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/gpu-instances/')({
  component: GpuInstancesPage,
})
