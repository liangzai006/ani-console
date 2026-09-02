import { GpuInventoryPage } from '@/components/gpu-inventory/GpuInventoryPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/gpu-inventory/')({
  component: GpuInventoryPage,
})
