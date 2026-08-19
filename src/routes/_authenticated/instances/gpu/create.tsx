import { Button, Card } from '@arco-design/web-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/shell/AppShell'
import { InstanceCreateForm } from '../index'

export const Route = createFileRoute('/_authenticated/instances/gpu/create')({
  component: GpuInstanceCreatePage,
})

function GpuInstanceCreatePage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <PageHeader
        title="创建 GPU 容器实例"
        subtitle="按页面分区填写镜像、规格、GPU 与网络配置。"
        extra={
          <Button type="text" onClick={() => navigate({ to: '/instances/gpu' })}>
            返回列表
          </Button>
        }
      />
      <Card>
        <InstanceCreateForm
          kindFilter="gpu_container"
          lockKind
          onCancel={() => navigate({ to: '/instances/gpu' })}
          onCreated={() => navigate({ to: '/instances/gpu' })}
        />
      </Card>
    </div>
  )
}
