import { createFileRoute } from '@tanstack/react-router'
import { Typography } from '@arco-design/web-react'
import { PageHeader } from '@/components/shell/AppShell'

export const Route = createFileRoute('/_authenticated/demo/b-1')({
  component: () => (
    <div>
      <PageHeader title="页面 B-1" subtitle="演示菜单 · 分组 B · 三级叶子" />
      <Typography.Text>页面内容：页面 B-1</Typography.Text>
    </div>
  ),
})
