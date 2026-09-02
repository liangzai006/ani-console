import { FilesystemDetailPage } from '@/components/storage/FilesystemDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/filesystems/$filesystemId')({
  component: function FilesystemDetailRoute() {
    const { filesystemId } = Route.useParams()
    return <FilesystemDetailPage filesystemId={filesystemId} />
  },
})
