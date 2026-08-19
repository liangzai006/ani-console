import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'

export const Route = createFileRoute('/_authenticated/bare-metal/')({
  component: () => <PlaceholderPage title="裸金属" description="BareMetalHosts API 尚未在 v1.yaml 中定义" />,
})
