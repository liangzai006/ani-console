import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

export const Route = createFileRoute('/_authenticated/notifications/')({
  component: () => <PlaceholderPage title="通知" description="Notifications API 尚未在 v1.yaml 中定义" />,
})
