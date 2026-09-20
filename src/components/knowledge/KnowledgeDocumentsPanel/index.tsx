import { withId } from "@/lib/id";
import { Empty, Modal, Space, Tag, Tooltip, Typography } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import {
  deleteKnowledgeBaseDocument,
  listKnowledgeBaseDocuments,
  reparseKnowledgeBaseDocument,
  type KBDocument,
} from "@/api/knowledge";
import {
  DataTable,
  ResourceNameId,
  TableSectionHeader,
  type ListColumn,
} from "@/components/common";
import { KnowledgeDocumentChunksDrawer } from "@/components/knowledge/KnowledgeDocumentChunksDrawer";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { formatDateTime } from "@/lib/format";
import styles from "./index.module.css";

function formatBytes(value?: number) {
  if (value == null) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

function metadataEntries(value: KBDocument["custom_metadata"]) {
  if (value == null || value === "") return [];
  let metadata: unknown = value;
  if (typeof value === "string") {
    try {
      metadata = JSON.parse(value) as unknown;
    } catch {
      return [["metadata", value]] as const;
    }
  }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [["metadata", String(metadata)]] as const;
  }
  return Object.entries(metadata).map(
    ([key, item]) => [key, typeof item === "string" ? item : JSON.stringify(item)] as const,
  );
}

function statusTag(document: KBDocument) {
  const tag = (
    <Tag
      color={
        document.parse_status === "ready"
          ? "green"
          : document.parse_status === "failed"
            ? "red"
            : "blue"
      }
    >
      {
        (
          {
            pending: "待上传",
            parsing: "解析中",
            indexing: "索引中",
            ready: "可检索",
            failed: "失败",
          } as const
        )[document.parse_status]
      }
    </Tag>
  );
  return document.error_message ? <Tooltip content={document.error_message}>{tag}</Tooltip> : tag;
}

export function KnowledgeDocumentsPanel({ kbId, action }: { kbId: string; action?: ReactNode }) {
  const qc = useQueryClient();
  const [previewDocument, setPreviewDocument] = useState<KBDocument>();
  const {
    query: documents,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
  } = useCursorPaginatedQuery<KBDocument>({
    errorNotification: {
      id: withId("knowledge-documents", kbId),
      action: "文档列表加载",
      fallback: "请求失败，请稍后重试",
    },
    queryKey: ["knowledge-base-documents", kbId],
    cursorScope: kbId,
    fetchPage: ({ cursor, limit }) => listKnowledgeBaseDocuments(kbId, { limit, cursor }),
  });
  const remove = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "knowledge-document-delete",
        action: "删除文档",
        successText: "文档已删除",
        errorFallback: "删除文档失败",
      },
    },
    mutationFn: (doc: KBDocument) => deleteKnowledgeBaseDocument(kbId, doc.id),
    onSuccess: () => {
      resetPagination();
      qc.invalidateQueries({ queryKey: ["knowledge-base-documents", kbId] });
      qc.invalidateQueries({ queryKey: ["knowledge-base", kbId] });
    },
  });
  const reparse = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "knowledge-document-reparse",
        action: "重新解析文档",
        successText: "已提交重新解析",
        errorFallback: "重新解析文档失败",
      },
    },
    mutationFn: (doc: KBDocument) => reparseKnowledgeBaseDocument(kbId, doc.id),
    onSuccess: () => {
      resetPagination();
      void qc.invalidateQueries({ queryKey: ["knowledge-base-documents", kbId] });
      void qc.invalidateQueries({ queryKey: ["knowledge-base", kbId] });
    },
  });
  const rows = documents.data?.items ?? [];
  const columns: Array<ListColumn<KBDocument>> = [
    {
      title: "文档 / ID",
      width: 280,
      fixed: "left",
      render: (_, item) => <ResourceNameId name={item.file_name} id={item.id} openable={false} />,
    },
    {
      title: "类型",
      width: 100,
      render: (_, item) => item.file_type?.toUpperCase() || "-",
    },
    {
      title: "文件大小",
      width: 120,
      render: (_, item) => formatBytes(item.file_size_bytes),
    },
    {
      title: "解析状态",
      width: 120,
      render: (_, item) => statusTag(item),
    },
    {
      title: "分块数",
      width: 100,
      render: (_, item) => item.chunk_count ?? 0,
    },
    {
      title: "自定义元数据",
      width: 260,
      render: (_, item) => {
        const metadata = metadataEntries(item.custom_metadata);
        return metadata.length ? (
          <div className={styles.metadataCell}>
            {metadata.map(([key, value]) => (
              <Tag key={key} className={styles.metadataTag}>
                {key}：{value}
              </Tag>
            ))}
          </div>
        ) : (
          "-"
        );
      },
    },
    {
      title: "创建时间",
      width: 180,
      render: (_, item) => formatDateTime(item.created_at),
    },
  ];

  return (
    <Space direction="vertical" size={16} className="w-full">
      <TableSectionHeader title="文档列表" extra={action} className="mb-0" />
      <DataTable<KBDocument>
        columns={columns}
        loading={documents.isLoading}
        data={rows}
        noDataElement={<Empty description="还没有文档，上传后可进行解析和问答" />}
        tableLabel="知识库文档与解析列表"
        scroll={{ x: 1370 }}
        rowActions={[
          {
            key: "view-chunks",
            label: "查看分块",
            visible: (item) => (item.chunk_count ?? 0) > 0,
            onClick: setPreviewDocument,
          },
          {
            key: "reparse",
            label: "重新解析",
            visible: (item) => item.parse_status === "failed",
            loading: (item) => reparse.isPending && reparse.variables?.id === item.id,
            onClick: (item) => {
              Modal.confirm({
                title: "重新解析文档",
                content: `重新解析将覆盖「${item.file_name}」现有分块，确定继续？`,
                onOk: () => reparse.mutateAsync(item),
              });
            },
          },
          {
            key: "delete",
            label: "删除",
            intent: "danger",
            loading: (item) => remove.isPending && remove.variables?.id === item.id,
            onClick: (item) => {
              Modal.confirm({
                title: "删除文档",
                content: `确定删除「${item.file_name}」？`,
                okButtonProps: { status: "danger" },
                onOk: () => remove.mutateAsync(item),
              });
            },
          },
        ]}
        pagination={{
          page,
          pageSize,
          total: documents.data?.total ?? rows.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
      />
      <KnowledgeDocumentChunksDrawer
        kbId={kbId}
        document={previewDocument}
        visible={Boolean(previewDocument)}
        onCancel={() => setPreviewDocument(undefined)}
      />
    </Space>
  );
}
