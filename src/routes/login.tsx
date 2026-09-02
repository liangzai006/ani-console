import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  component: function LoginLayout() {
    return <Outlet />
  },
})
