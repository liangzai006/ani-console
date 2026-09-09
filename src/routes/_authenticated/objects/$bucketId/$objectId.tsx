import { ObjectDetailPage } from "@/components/storage/ObjectDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/objects/$bucketId/$objectId")({
  component: function ObjectDetailRoute() {
    const { bucketId, objectId } = Route.useParams();
    return <ObjectDetailPage bucketId={bucketId} objectId={objectId} />;
  },
});
