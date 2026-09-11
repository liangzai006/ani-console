import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal, Spin } from "@arco-design/web-react";
import { showApiError } from "@/lib/api-error";
import { deleteKnowledgeBase, getKnowledgeBase } from "@/api/knowledge";
import { listVectorStores, type VectorStore } from "@/api/storage/vector-stores";
import { DetailPageFrame, DetailPagePlaceholder, AliIcon, StatusTag } from "@/components/common";
import { KnowledgeChatPanel } from "@/components/knowledge/KnowledgeChatPanel";
import { KnowledgeDocumentsPanel } from "@/components/knowledge/KnowledgeDocumentsPanel";
import { KnowledgeDocumentUploadButton } from "@/components/knowledge/KnowledgeDocumentUploadButton";
import { KnowledgePermissionsPanel } from "@/components/knowledge/KnowledgePermissionsPanel";
import { KnowledgeBaseAuditLogsPanel } from "@/components/knowledge/KnowledgeBaseAuditLogsPanel";
import { formatDateTime } from "@/lib/format";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";

export type KnowledgeBaseDetailTabKey =
  | "overview"
  | "documents"
  | "chat"
  | "permissions"
  | "history";

export function KnowledgeBaseDetailPage({
  kbId,
  tab,
}: {
  kbId: string;
  tab: KnowledgeBaseDetailTabKey;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["knowledge-base", kbId],
    queryFn: () => getKnowledgeBase(kbId),
  });
  useListErrorNotification({
    id: `knowledge-base-detail:${kbId}`,
    title: "知识库加载失败",
    error: detail.error,
  });
  const vectorStores = useQuery({
    queryKey: ["vector-stores", "knowledge-base", kbId],
    queryFn: () => listVectorStores({ limit: 100 }),
  });
  const remove = useMutation({
    mutationFn: () => deleteKnowledgeBase(kbId),
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
  if (!detail.data)
    return (
      <DetailPagePlaceholder
        breadcrumbs={[{ label: "知识库" }, { label: "知识库管理", to: "/kb" }, { label: kbId }]}
        title={kbId}
        idLabel="知识库 ID"
        idValue={kbId}
        iconName="zhishiku"
      />
    );
  const kb = detail.data;
  const relatedVectorStore = (vectorStores.data?.items ?? []).find(
    (item: VectorStore) => item.knowledge_base_ref?.id === kb.id,
  ) as VectorStore | undefined;
  return (
    <DetailPageFrame
      breadcrumbs={[{ label: "知识库" }, { label: "知识库管理", to: "/kb" }, { label: kb.name }]}
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
            { label: "描述", value: kb.description || "-" },
            { label: "Embedding 模型", value: kb.embedding_model || "-" },
            { label: "分块大小", value: kb.chunk_size ?? "-" },
            { label: "默认 TopK", value: kb.top_k ?? "-" },
            { label: "相似度阈值", value: kb.score_threshold ?? "-" },
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
                  search={{ tab: undefined }}
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
          content: (
            <KnowledgeDocumentsPanel
              kbId={kbId}
              action={<KnowledgeDocumentUploadButton kbId={kbId} />}
            />
          ),
        },
        {
          key: "chat",
          label: "问答",
          content: <KnowledgeChatPanel kbId={kbId} defaultTopK={kb.top_k ?? 5} />,
        },
        {
          key: "permissions",
          label: "权限",
          content: <KnowledgePermissionsPanel kbId={kbId} />,
        },
        {
          key: "history",
          label: "操作历史",
          content: <KnowledgeBaseAuditLogsPanel kbId={kbId} />,
        },
      ]}
      defaultTabKey={tab}
      onBack={() => navigate({ to: "/kb" })}
    />
  );
}
