import { Button, Card } from '@arco-design/web-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/shell/AppShell'
import { InstanceCreateForm } from '../index'

export const Route = createFileRoute('/_authenticated/instances/vm/create')({
  component: VmInstanceCreatePage,
})

function VmInstanceCreatePage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <PageHeader
        title="创建云主机 VM"
        subtitle="按页面分区填写镜像、规格、SSH 与网络配置。"
        extra={
          <Button type="text" onClick={() => navigate({ to: '/instances/vm' })}>
            返回列表
          </Button>
        }
      />
      <Card>
        <InstanceCreateForm
          kindFilter="vm"
          lockKind
          onCancel={() => navigate({ to: '/instances/vm' })}
          onCreated={() => navigate({ to: '/instances/vm' })}
        />
      </Card>
    </div>
  )
}
