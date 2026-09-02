import { LoginCallbackPage } from '@/components/auth/LoginCallbackPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login/callback')({
  component: LoginCallbackPage,
})
