import {
  KnowledgeBaseDetailPage,
  type KnowledgeBaseDetailTabKey,
} from '@/components/knowledge/KnowledgeBaseDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/kb/$kbId')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (String(search.tab) === 'overview'
      ? 'documents'
      : ['documents', 'chat', 'permissions', 'history'].includes(String(search.tab))
        ? search.tab
        : 'documents') as KnowledgeBaseDetailTabKey,
  }),
  component: function KnowledgeBaseDetailRoute() {
    const { kbId } = Route.useParams()
    const { tab } = Route.useSearch()
    return <KnowledgeBaseDetailPage kbId={kbId} tab={tab} />
  },
})
