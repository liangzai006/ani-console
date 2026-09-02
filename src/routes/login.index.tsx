import { LoginPage } from '@/components/auth/LoginPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login/')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' && search.redirect.startsWith('/') ? { redirect: search.redirect } : {},
  component: function LoginRouteComponent() {
    const { redirect } = Route.useSearch()
    return <LoginPage redirect={redirect} />
  },
})
