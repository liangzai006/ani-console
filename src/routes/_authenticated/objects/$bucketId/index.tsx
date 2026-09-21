import { BucketDetailPage } from "@/components/storage/BucketDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/objects/$bucketId/")({
  component: function BucketDetailRoute() {
    const { bucketId } = Route.useParams();
    const { tab } = Route.useSearch();
    return <BucketDetailPage bucketId={bucketId} tab={tab} />;
  },
});
