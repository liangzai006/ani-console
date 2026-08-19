import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { InstancesListPage } from './index'

export const Route = createFileRoute('/_authenticated/instances/sandbox')({
  component: SandboxInstancesPage,
})

function SandboxInstancesPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname !== '/instances/sandbox') return <Outlet />
  return <InstancesListPage kindFilter="sandbox" lockKind title="Sandbox 实例" subtitle="隔离会话与出口策略" />
}
