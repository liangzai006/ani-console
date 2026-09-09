import { createFileRoute } from "@tanstack/react-router";
import { VmVolumeDetailPage } from "@/components/instances/VmVolumeDetailPage";

export const Route = createFileRoute("/_authenticated/vm-instances/$instanceId/volumes/$volumeId")({
  component: function VmVolumeDetailRoute() {
    const { instanceId, volumeId } = Route.useParams();
    return <VmVolumeDetailPage instanceId={instanceId} volumeId={volumeId} />;
  },
});
