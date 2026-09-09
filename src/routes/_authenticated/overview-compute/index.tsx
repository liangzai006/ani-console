import { ComputeOverviewPage } from "@/components/overview/ComputeOverviewPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/overview-compute/")({
  component: ComputeOverviewPage,
});
