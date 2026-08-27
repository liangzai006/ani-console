import { createFileRoute, Outlet } from '@tanstack/react-router'

const bucketDetailTabKeys = ['objects', 'permissions', 'lifecycle', 'access', 'overview'] as const
type BucketDetailTabKey = (typeof bucketDetailTabKeys)[number]

export const Route = createFileRoute('/_authenticated/objects/$bucketId')({
  validateSearch: (search: Record<string, unknown>): { tab?: BucketDetailTabKey; action?: 'upload' } => ({
    tab: bucketDetailTabKeys.includes(search.tab as BucketDetailTabKey)
      ? (search.tab as BucketDetailTabKey)
      : undefined,
    action: search.action === 'upload' ? 'upload' : undefined,
  }),
  component: () => <Outlet />,
})
