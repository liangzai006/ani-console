import {
  VectorStoreDetailPage,
  type VectorStoreDetailTabKey,
} from "@/components/storage/VectorStoreDetailPage";
import { createFileRoute } from "@tanstack/react-router";

const vectorStoreDetailTabKeys = ["index", "search", "related", "events"] as const;

export const Route = createFileRoute("/_authenticated/vector-stores/$vectorStoreId")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: vectorStoreDetailTabKeys.includes(search.tab as VectorStoreDetailTabKey)
      ? (search.tab as VectorStoreDetailTabKey)
      : undefined,
  }),
  component: function VectorStoreDetailRoute() {
    const { vectorStoreId } = Route.useParams();
    const { tab } = Route.useSearch();
    return <VectorStoreDetailPage vectorStoreId={vectorStoreId} tab={tab} />;
  },
});
