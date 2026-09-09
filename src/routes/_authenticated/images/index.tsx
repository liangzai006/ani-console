import { ImagesPage } from "@/components/registry/ImagesPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/images/")({
  component: ImagesPage,
});
