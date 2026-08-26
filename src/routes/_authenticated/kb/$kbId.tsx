import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Empty, Modal, Space, Spin } from "@arco-design/web-react";
import { coreApi } from "@/api/client";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import type { components as coreComponents } from "@/api/core-schema";
import { showApiError } from "@/api/helpers";
import { DetailPageFrame } from "@/components/detailbase";
import { ApiErrorAlert } from "@/components/feedback/ApiErrorAlert";
import { AliIcon } from "@/components/icons/AliIcon";
import { KnowledgeChatPanel } from "@/components/knowledge/KnowledgeChatPanel";
import { KnowledgeDocumentsPanel } from "@/components/knowledge/KnowledgeDocumentsPanel";
import { StatusTag } from "@/components/shell/StatusTag";
import { listOrThrow } from "@/lib/api-list";
import { formatDateTime } from "@/lib/format";

type KnowledgeBase = components["schemas"]["KnowledgeBase"];
type VectorStore = coreComponents["schemas"]["VectorStore"];
type VectorStoreListResponse = coreComponents["schemas"]["VectorStoreListResponse"];
type TabKey = "overview" | "documents" | "chat" | "permissions" | "history";

export const Route = createFileRoute("/_authenticated/kb/$kbId")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (String(search.tab) === "overview"
      ? "documents"
      : ["documents", "chat", "permissions", "history"].includes(
            String(search.tab),
          )
        ? search.tab
        : "documents") as TabKey,
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
  const vectorStores = useQuery({
    queryKey: ["vector-stores", "knowledge-base", kbId],
    queryFn: () =>
      listOrThrow<VectorStoreListResponse>(() =>
        coreApi.GET("/vector-stores", {
          params: { query: { limit: 100 } },
        }),
      ),
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
  const relatedVectorStore = (vectorStores.data?.items ?? []).find(
    (item: VectorStore) => item.knowledge_base_ref?.id === kb.id,
  ) as VectorStore | undefined;
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
            { label: "分块大小", value: kb.chunk_size ?? "—" },
            { label: "默认 TopK", value: kb.top_k ?? "—" },
            { label: "相似度阈值", value: kb.score_threshold ?? "—" },
            { label: "创建时间", value: formatDateTime(kb.created_at) },
            { label: "更新时间", value: formatDateTime(kb.updated_at) },
          ],
        },
        {
          key: "related-summary",
          title: "关联摘要",
          fields: [
            { label: "文档", value: `${kb.doc_count ?? 0} 个` },
            {
              label: "向量存储",
              value: vectorStores.isLoading ? (
                "加载中"
              ) : vectorStores.error ? (
                "加载失败"
              ) : relatedVectorStore ? (
                <Link
                  to="/vector-stores/$vectorStoreId"
                  params={{ vectorStoreId: relatedVectorStore.id }}
                >
                  {relatedVectorStore.name}
                </Link>
              ) : (
                "暂无关联向量存储"
              ),
            },
          ],
        },
      ]}
      tabs={[
        {
          key: "documents",
          label: "文档与解析",
          content: <KnowledgeDocumentsPanel kbId={kbId} />,
        },
        {
          key: "chat",
          label: "问答",
          content: <KnowledgeChatPanel kbId={kbId} defaultTopK={kb.top_k ?? 5} />,
        },
        {
          key: "permissions",
          label: "权限",
          content: (
            <Space direction="vertical" size={12} className="w-full">
              <Alert
                type="info"
                showIcon
                content="权限用于控制知识库是否公开可读以及指定成员的访问范围。"
              />
              <Empty description="当前后端权限能力尚未完成，暂不提供配置入口" />
            </Space>
          ),
        },
        {
          key: "history",
          label: "操作历史",
          content: (
            <Empty description="当前后端暂未提供知识库操作历史接口" />
          ),
        },
      ]}
      defaultTabKey={tab}
      onBack={() => navigate({ to: "/kb" })}
    />
  );
}
