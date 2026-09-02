import { Button, Card, Spin, Typography } from '@arco-design/web-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { listOrThrow } from '@/lib/api-list'
import { InstanceCreateForm } from '@/components/compute-instances/ComputeInstancesPage'
import type { components } from '@/api/core-schema'

export function SandboxInstanceCreatePage({ templateId }: { templateId?: string }) {
  const navigate = useNavigate()
  type SandboxTemplate = components['schemas']['SandboxTemplate']
  const templates = useQuery({
    queryKey: ['sandbox-templates', 'create-select'],
    queryFn: () => listOrThrow(() => coreApi.GET('/sandbox-templates', { params: { query: { limit: 100 } } })),
    enabled: Boolean(templateId),
  })
  const templateItems = ((templates.data as { items?: SandboxTemplate[] } | undefined)?.items ?? [])
  const selectedTemplate = templateItems.find((item) => item.id === templateId)
  const templateInitialValues = selectedTemplate
    ? {
        image: selectedTemplate.image,
        ...(selectedTemplate.cpu_cores ? { cpu: String(selectedTemplate.cpu_cores) } : {}),
        ...(selectedTemplate.memory_gb ? { memory: `${selectedTemplate.memory_gb}Gi` } : {}),
      }
    : undefined

  return (
    <div className="space-y-5">
      <PageHeader
        title="创建 Sandbox 实例"
        subtitle="按页面分区填写运行时、会话时长与网络出口策略。"
        extra={
          <Button type="text" onClick={() => navigate({ to: '/sandbox-instances' })}>
            返回列表
          </Button>
        }
      />
      <Card>
        {templateId && templates.isLoading ? (
          <div className="py-10 text-center">
            <Spin />
          </div>
        ) : null}
        {selectedTemplate ? (
          <Typography.Paragraph type="secondary">
            已使用模板 {selectedTemplate.name} 预填镜像与资源规格。
          </Typography.Paragraph>
        ) : null}
        {!templateId || !templates.isLoading ? (
          <InstanceCreateForm
            kindFilter="sandbox"
            lockKind
            initialValues={templateInitialValues}
            onCancel={() => navigate({ to: '/sandbox-instances' })}
            onCreated={({ instanceId }) =>
              navigate(instanceId ? { to: '/sandbox-instances/$instanceId', params: { instanceId } } : { to: '/sandbox-instances' })
            }
          />
        ) : null}
      </Card>
    </div>
  )
}
