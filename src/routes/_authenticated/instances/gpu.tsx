import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { InstancesListPage } from './index'

export const Route = createFileRoute('/_authenticated/instances/gpu')({
  component: GpuInstancesPage,
})

function GpuInstancesPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname !== '/instances/gpu') return <Outlet />
  return <InstancesListPage kindFilter="gpu_container" lockKind title="GPU 容器实例" subtitle="带 GPU 资源请求的容器" />
}
