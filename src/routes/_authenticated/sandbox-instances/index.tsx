import { createFileRoute } from "@tanstack/react-router";
import { SandboxInstancesPage as SandboxInstancesContent } from "@/components/instances/SandboxInstancesPage";

export const Route = createFileRoute("/_authenticated/sandbox-instances/")({
  component: function SandboxInstancesPage() {
    return <SandboxInstancesContent />;
  },
});
