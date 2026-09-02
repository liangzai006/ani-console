import { SecurityGroupsPage } from '@/components/network/SecurityGroupsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/security-groups/')({
  component: SecurityGroupsPage,
})
