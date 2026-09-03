import { createFileRoute } from "@tanstack/react-router";
import { SandboxInstancesPage } from "@/components/instances/SandboxInstancesPage";

export const Route = createFileRoute("/_authenticated/sandbox-instances/")({
  component: SandboxInstancesPage,
});
