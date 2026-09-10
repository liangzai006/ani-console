import {
  Empty,
  Button,
  Message,
  Modal,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { showApiError } from "@/lib/api-error";
import {
  deleteKnowledgeBaseDocument,
  listKnowledgeBaseDocuments,
  reparseKnowledgeBaseDocument,
  type KBDocument,
} from "@/api/knowledge";
import {
  ApiErrorAlert,
  DataTable,
  DataTableNameCell,
  DataTableRowActionButton,
  DataTableRowActions,
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
    queryKey: ["knowledge-base-documents", kbId],
    cursorScope: kbId,
    fetchPage: ({ cursor, limit }) => listKnowledgeBaseDocuments(kbId, { limit, cursor }),
  });
  const remove = useMutation({
    mutationFn: (doc: KBDocument) => deleteKnowledgeBaseDocument(kbId, doc.id),
    onSuccess: () => {
      Message.success("文档已删除");
      resetPagination();
      qc.invalidateQueries({ queryKey: ["knowledge-base-documents", kbId] });
      qc.invalidateQueries({ queryKey: ["knowledge-base", kbId] });
    },
    onError: (error) => showApiError(error, "删除文档失败"),
  });
  const reparse = useMutation({
    mutationFn: (doc: KBDocument) => reparseKnowledgeBaseDocument(kbId, doc.id),
    onSuccess: () => {
      Message.success("已提交重新解析");
      resetPagination();
      void qc.invalidateQueries({ queryKey: ["knowledge-base-documents", kbId] });
      void qc.invalidateQueries({ queryKey: ["knowledge-base", kbId] });
    },
    onError: (error) => showApiError(error, "重新解析文档失败"),
  });
  const rows = documents.data?.items ?? [];
  const columns: Array<ListColumn<KBDocument>> = [
    {
      title: "文档 / ID",
      width: 280,
      render: (_, item) => (
        <DataTableNameCell
          name={<Typography.Text bold>{item.file_name}</Typography.Text>}
          id={item.id}
        />
      ),
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
    {
      title: "操作",
      width: 230,
      fixed: "right",
      render: (_, item) => (
        <DataTableRowActions>
          {(item.chunk_count ?? 0) > 0 ? (
            <DataTableRowActionButton onClick={() => setPreviewDocument(item)}>
              查看分块
            </DataTableRowActionButton>
          ) : null}
          {item.parse_status === "failed" ? (
            <DataTableRowActionButton
              loading={reparse.isPending && reparse.variables?.id === item.id}
              onClick={() =>
                Modal.confirm({
                  title: "重新解析文档",
                  content: `重新解析将覆盖「${item.file_name}」现有分块，确定继续？`,
                  onOk: () => reparse.mutateAsync(item),
                })
              }
            >
              重新解析
            </DataTableRowActionButton>
          ) : null}
          <DataTableRowActionButton
            status="danger"
            loading={remove.isPending && remove.variables?.id === item.id}
            onClick={() =>
              Modal.confirm({
                title: "删除文档",
                content: `确定删除「${item.file_name}」？`,
                okButtonProps: { status: "danger" },
                onOk: () => remove.mutateAsync(item),
              })
            }
          >
            删除
          </DataTableRowActionButton>
        </DataTableRowActions>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} className="w-full">
      <TableSectionHeader title="文档列表" extra={action} className="mb-0" />
      {documents.error ? (
        <Space direction="vertical" size={8} className="w-full">
          <ApiErrorAlert error={documents.error} title="文档列表加载失败" />
          <Button onClick={() => void documents.refetch()}>重试</Button>
        </Space>
      ) : null}
      <DataTable<KBDocument>
        columns={columns}
        loading={documents.isLoading}
        data={documents.error ? [] : rows}
        noDataElement={<Empty description="还没有文档，上传后可进行解析和问答" />}
        tableLabel="知识库文档与解析列表"
        scroll={{ x: 1370 }}
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
