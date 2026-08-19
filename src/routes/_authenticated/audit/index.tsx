import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

export const Route = createFileRoute('/_authenticated/audit/')({
  component: () => <PlaceholderPage title="审计" description="Audit API 尚未在 v1.yaml 中定义" />,
})
