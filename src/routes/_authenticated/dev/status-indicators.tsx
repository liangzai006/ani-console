import { createFileRoute } from "@tanstack/react-router";
import { StatusIndicatorReferencePage } from "@/components/dev/StatusIndicatorReferencePage";

export const Route = createFileRoute("/_authenticated/dev/status-indicators")({
  component: StatusIndicatorReferencePage,
});
