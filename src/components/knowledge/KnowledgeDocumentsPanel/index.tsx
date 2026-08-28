import {
  Button,
  Empty,
  List,
  Message,
  Modal,
  Pagination,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { showApiError } from "@/api/helpers";
import { ApiErrorAlert } from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { formatDateTime } from "@/lib/format";
import styles from "./index.module.css";

type KBDocument = components["schemas"]["KBDocument"];

function formatBytes(value?: number) {
  if (value == null) return "—";
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
  return Object.entries(metadata).map(([key, item]) => [
    key,
    typeof item === "string" ? item : JSON.stringify(item),
  ] as const);
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
  return document.error_message ? (
    <Tooltip content={document.error_message}>{tag}</Tooltip>
  ) : (
    tag
  );
}

export function KnowledgeDocumentsPanel({ kbId }: { kbId: string }) {
  const qc = useQueryClient();
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
    fetchPage: async ({ cursor, limit }) => {
      const { data, error } = await servicesApi.GET(
        "/knowledge-bases/{kb_id}/documents",
        { params: { path: { kb_id: kbId }, query: { limit, cursor } } },
      );
      if (error || !data) throw error ?? new Error("文档列表未返回结果");
      return data;
    },
  });
  const remove = useMutation({
    mutationFn: async (doc: KBDocument) => {
      const { error } = await servicesApi.DELETE(
        "/knowledge-bases/{kb_id}/documents/{doc_id}",
        { params: { path: { kb_id: kbId, doc_id: doc.id } } },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      Message.success("文档已删除");
      resetPagination();
      qc.invalidateQueries({ queryKey: ["knowledge-base-documents", kbId] });
      qc.invalidateQueries({ queryKey: ["knowledge-base", kbId] });
    },
    onError: (error) => showApiError(error, "删除文档失败"),
  });
  const rows = documents.data?.items ?? [];
  return (
    <Space direction="vertical" size={16} className="w-full">
      {documents.error ? (
        <Space direction="vertical" size={8} className="w-full">
          <ApiErrorAlert error={documents.error} title="文档列表加载失败" />
          <Button onClick={() => void documents.refetch()}>重试</Button>
        </Space>
      ) : null}
      <List
        bordered
        loading={documents.isLoading}
        dataSource={documents.error ? [] : rows}
        noDataElement={<Empty description="还没有文档，上传后可进行解析和问答" />}
        render={(item: KBDocument) => {
          const metadata = metadataEntries(item.custom_metadata);
          return (
            <List.Item key={item.id} className={styles.documentItem}>
              <div className={styles.documentMainRow}>
                <div className={styles.documentIdentity}>
                  <Typography.Text bold>{item.file_name}</Typography.Text>
                  <Typography.Text type="secondary" className={styles.documentSummary}>
                    {item.file_type?.toUpperCase() || "未知类型"} · {formatBytes(item.file_size_bytes)} · {item.chunk_count ?? 0} 个分块
                  </Typography.Text>
                </div>
                <div className={styles.documentActions}>
                  {statusTag(item)}
                  <Typography.Text type="secondary">
                    {formatDateTime(item.created_at)}
                  </Typography.Text>
                  <Button
                    type="text"
                    size="small"
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
                  </Button>
                </div>
              </div>
              <div className={styles.metadataRow}>
                {metadata.length ? (
                  metadata.map(([key, value]) => (
                    <Tag key={key} className={styles.metadataTag}>
                      {key}：{value}
                    </Tag>
                  ))
                ) : (
                  <Typography.Text type="secondary">暂无自定义元数据</Typography.Text>
                )}
              </div>
            </List.Item>
          );
        }}
      />
      {(documents.data?.total ?? 0) > pageSize ? (
        <div className={styles.pagination}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={documents.data?.total ?? 0}
            sizeCanChange
            showTotal
            onChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      ) : null}
    </Space>
  );
}
