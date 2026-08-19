import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button, Tag } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { CursorTable } from '@/components/tables/CursorTable'
import type { components } from '@/api/core-schema'

export const Route = createFileRoute('/_authenticated/sandbox-templates/')({
  component: SandboxTemplatesPage,
})

function SandboxTemplatesPage() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery({
    queryKey: ['sandbox-templates'],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/sandbox-templates', { params: { query: { limit: 50 } } })
      if (error) throw error
      return data
    },
  })

  type Row = components['schemas']['SandboxTemplate'] & { kind?: string }
  const items = (data?.items ?? []) as Row[]

  return (
    <>
      <PageHeader title="Sandbox 模板" subtitle="预置沙箱运行环境模板" />
      <CursorTable<Row>
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: '镜像', dataIndex: 'image' },
          { title: '类型', render: (_, r) => r.kind ?? 'sandbox' },
          {
            title: '资源规格',
            render: (_, r) => [r.cpu_cores ? `${r.cpu_cores} vCPU` : null, r.memory_gb ? `${r.memory_gb}Gi` : null]
              .filter(Boolean)
              .join(' / ') || '-',
          },
          { title: '内置', render: (_, r) => (r.is_builtin ? <Tag color="arcoblue">内置</Tag> : '-') },
          {
            title: '操作',
            render: (_, r) => (
              <Button
                type="text"
                onClick={() => navigate({ to: '/instances/sandbox/create', search: { template_id: r.id } })}
              >
                使用模板
              </Button>
            ),
          },
        ]}
        data={{ items, next_cursor: data?.next_cursor }}
        loading={isLoading}
        error={error}
        rowKey="id"
        emptyDescription="暂无 Sandbox 模板"
      />
    </>
  )
}
