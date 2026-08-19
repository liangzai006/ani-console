import { createFileRoute } from '@tanstack/react-router'
import { Typography } from '@arco-design/web-react'
import { PageHeader } from '@/components/shell/AppShell'

export const Route = createFileRoute('/_authenticated/demo/leaf')({
  component: () => (
    <div>
      <PageHeader title="独立叶子页" subtitle="演示菜单 · 二级叶子" />
      <Typography.Text>页面内容：独立叶子页</Typography.Text>
    </div>
  ),
})
