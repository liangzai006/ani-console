import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal, Spin } from "@arco-design/web-react";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { showApiError } from "@/api/helpers";
import { DetailPageFrame } from "@/components/detailbase";
import { ApiErrorAlert } from "@/components/feedback/ApiErrorAlert";
import { AliIcon } from "@/components/icons/AliIcon";
import { KnowledgeChatPanel } from "@/components/knowledge/KnowledgeChatPanel";
import { KnowledgeDocumentsPanel } from "@/components/knowledge/KnowledgeDocumentsPanel";
import { StatusTag } from "@/components/shell/StatusTag";
import { formatDateTime } from "@/lib/format";

type KnowledgeBase = components["schemas"]["KnowledgeBase"];
type TabKey = "overview" | "documents" | "chat";

export const Route = createFileRoute("/_authenticated/kb/$kbId")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (["overview", "documents", "chat"].includes(String(search.tab))
      ? search.tab
      : "overview") as TabKey,
  }),
  component: KnowledgeBaseDetailPage,
});

function KnowledgeBaseDetailPage() {
  const { kbId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["knowledge-base", kbId],
    queryFn: async () => {
      const { data, error } = await servicesApi.GET(
        "/knowledge-bases/{kb_id}",
        { params: { path: { kb_id: kbId } } },
      );
      if (error) throw error;
      return data;
    },
  });
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await servicesApi.DELETE("/knowledge-bases/{kb_id}", {
        params: { path: { kb_id: kbId } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-bases"] });
      navigate({ to: "/kb" });
    },
    onError: (error) => showApiError(error, "删除知识库失败"),
  });
  if (detail.isLoading && !detail.data)
    return (
      <div className="flex justify-center py-20">
        <Spin />
      </div>
    );
  if (detail.error || !detail.data)
    return (
      <ApiErrorAlert
        error={detail.error ?? new Error("知识库不存在或无权访问")}
        title="知识库加载失败"
      />
    );
  const kb = detail.data as KnowledgeBase;
  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: "知识库" },
        { label: "知识库管理", to: "/kb" },
        { label: kb.name },
      ]}
      title={kb.name}
      status={<StatusTag status={kb.status} />}
      icon={<AliIcon name="zhishiku" size={28} />}
      headerItems={[
        { label: "知识库 ID", value: kb.id },
        { label: "文档数", value: kb.doc_count ?? 0 },
        { label: "创建时间", value: formatDateTime(kb.created_at) },
      ]}
      actions={
        <Button
          status="danger"
          loading={remove.isPending}
          onClick={() =>
            Modal.confirm({
              title: "删除知识库",
              content: `确定删除「${kb.name}」？知识库及其文档将不可恢复。`,
              okButtonProps: { status: "danger" },
              onOk: () => remove.mutateAsync(),
            })
          }
        >
          删除
        </Button>
      }
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [
            { label: "ID", value: kb.id },
            { label: "名称", value: kb.name },
            { label: "状态", value: <StatusTag status={kb.status} /> },
            { label: "描述", value: kb.description || "—" },
            { label: "Embedding 模型", value: kb.embedding_model || "—" },
            { label: "文档数", value: kb.doc_count ?? 0 },
            { label: "创建时间", value: formatDateTime(kb.created_at) },
            { label: "更新时间", value: formatDateTime(kb.updated_at) },
          ],
        },
        {
          key: "retrieval",
          title: "检索参数",
          fields: [
            { label: "分块大小", value: kb.chunk_size ?? "—" },
            { label: "默认 TopK", value: kb.top_k ?? "—" },
            { label: "相似度阈值", value: kb.score_threshold ?? "—" },
          ],
        },
      ]}
      tabs={[
        {
          key: "overview",
          label: "概览",
          content: (
            <div
              className="py-4 text-center"
              style={{ color: "var(--color-text-3)" }}
            >
              知识库基本信息与检索参数见左侧详情栏
            </div>
          ),
        },
        {
          key: "documents",
          label: "文档与解析",
          content: <KnowledgeDocumentsPanel kbId={kbId} />,
        },
        {
          key: "chat",
          label: "问答",
          content: <KnowledgeChatPanel kbId={kbId} />,
        },
      ]}
      defaultTabKey={tab}
      onBack={() => navigate({ to: "/kb" })}
    />
  );
}
