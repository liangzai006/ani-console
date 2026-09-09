import { KnowledgeBasesPage } from "@/components/knowledge/KnowledgeBasesPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/kb/")({
  component: KnowledgeBasesPage,
});
