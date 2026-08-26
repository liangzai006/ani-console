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
  Upload,
} from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { showApiError } from "@/api/helpers";
import { ApiErrorAlert } from "@/components/common/ApiErrorAlert";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { formatDateTime } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";
import styles from "./index.module.css";

type KBDocument = components["schemas"]["KBDocument"];
const allowedTypes = ["pdf", "docx", "xlsx", "pptx", "md", "txt"] as const;

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

async function sha256(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
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
    refetchInterval: (data) =>
      data?.items.some((item) =>
        ["pending", "parsing", "indexing"].includes(item.parse_status),
      )
        ? 3000
        : false,
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fileType = file.name.split(".").pop()?.toLowerCase();
      if (!allowedTypes.includes(fileType as (typeof allowedTypes)[number]))
        throw new Error("仅支持 PDF、DOCX、XLSX、PPTX、Markdown 和 TXT 文件");
      if (file.size > 100 * 1024 * 1024) throw new Error("文件不能超过 100 MB");
      const idempotencyKey = newIdempotencyKey();
      const { data: reservation, error } = await servicesApi.POST(
        "/knowledge-bases/{kb_id}/documents",
        {
          params: { path: { kb_id: kbId } },
          body: {
            idempotency_key: idempotencyKey,
            file_name: file.name,
            file_type: fileType as (typeof allowedTypes)[number],
            file_size_bytes: file.size,
            checksum_sha256: await sha256(file),
          },
        },
      );
      if (error || !reservation) throw error ?? new Error("未获取到上传地址");
      const put = await fetch(reservation.upload_url, {
        method: "PUT",
        body: file,
        headers: file.type ? { "Content-Type": file.type } : undefined,
      });
      if (!put.ok) throw new Error(`文件上传失败（HTTP ${put.status}）`);
      const { error: notifyError } = await servicesApi.POST(
        "/knowledge-bases/{kb_id}/documents/{doc_id}/notify-uploaded",
        {
          params: { path: { kb_id: kbId, doc_id: reservation.doc_id } },
          body: {
            idempotency_key: idempotencyKey,
            doc_id: reservation.doc_id,
            storage_path: reservation.storage_path,
          },
        },
      );
      if (notifyError) throw notifyError;
    },
    onSuccess: () => {
      Message.success("文档已上传，正在解析");
      resetPagination();
      qc.invalidateQueries({ queryKey: ["knowledge-base-documents", kbId] });
      qc.invalidateQueries({ queryKey: ["knowledge-base", kbId] });
    },
    onError: (error) => showApiError(error, "文档上传失败"),
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
      <div className="flex items-center justify-between">
        <Typography.Title heading={6}>文档与解析</Typography.Title>
        <Upload
          accept=".pdf,.docx,.xlsx,.pptx,.md,.txt"
          showUploadList={false}
          customRequest={({ file }) => upload.mutate(file as File)}
        >
          <Button type="primary" loading={upload.isPending}>
            上传文档
          </Button>
        </Upload>
      </div>
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
