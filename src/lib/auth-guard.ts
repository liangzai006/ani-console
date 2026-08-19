import { redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/stores/auth'

export function requireAuth() {
  if (!isAuthenticated()) {
    throw redirect({ to: '/login' })
  }
}
