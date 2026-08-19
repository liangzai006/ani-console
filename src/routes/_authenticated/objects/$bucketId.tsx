import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/objects/$bucketId')({
  component: () => <Outlet />,
})
