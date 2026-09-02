import { createFileRoute } from '@tanstack/react-router'
import { InstancesListPage } from '@/components/compute-instances/ComputeInstancesPage'

export const Route = createFileRoute('/_authenticated/sandbox-instances/')({
  component: function SandboxInstancesPage() {
    return <InstancesListPage kindFilter="sandbox" lockKind title="Sandbox 实例" subtitle="隔离会话与出口策略" />
  },
})
