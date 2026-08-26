import { Empty, Typography } from '@arco-design/web-react'
import { PageHeader } from '@/components/shell/AppShell'

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle={description} />
      <Empty description="API 契约尚未定义对应接口，页面已预留路由骨架" />
      <Typography.Text type="secondary" className="block text-center text-sm">
        待 Core API 落地后补充实现
      </Typography.Text>
    </div>
  )
}
