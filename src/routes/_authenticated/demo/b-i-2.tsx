import { createFileRoute } from '@tanstack/react-router'
import { Typography } from '@arco-design/web-react'
import { PageHeader } from '@/components/shell/AppShell'

export const Route = createFileRoute('/_authenticated/demo/b-i-2')({
  component: () => (
    <div>
      <PageHeader title="页面 B-i-2" subtitle="演示菜单 · 分组 B · 子分组 B-i · 四级叶子" />
      <Typography.Text>页面内容：页面 B-i-2</Typography.Text>
    </div>
  ),
})
