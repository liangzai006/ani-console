import {
  Button,
  Message,
  Modal,
  Space,
  Tag,
  Typography,
  Upload,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { showApiError } from "@/api/helpers";
import {
  DataTable,
  ListRowActionButton,
  ListRowActions,
  type ListColumn,
} from "@/components/pagebase";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";

type KBDocument = components["schemas"]["KBDocument"];
const allowedTypes = ["pdf", "docx", "xlsx", "pptx", "md", "txt"] as const;

function formatBytes(value?: number) {
  if (value == null) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const documents = useQuery({
    queryKey: ["knowledge-base-documents", kbId],
    queryFn: async () => {
      const { data, error } = await servicesApi.GET(
        "/knowledge-bases/{kb_id}/documents",
        { params: { path: { kb_id: kbId } } },
      );
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) =>
      query.state.data?.items?.some((item) =>
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
      qc.invalidateQueries({ queryKey: ["knowledge-base-documents", kbId] });
      qc.invalidateQueries({ queryKey: ["knowledge-base", kbId] });
    },
    onError: (error) => showApiError(error, "删除文档失败"),
  });
  const rows = documents.data?.items ?? [];
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const columns: Array<ListColumn<KBDocument>> = [
    {
      key: "name",
      title: "文件名",
      minWidth: 240,
      render: (item) => (
        <Space direction="vertical" size={2}>
          <Typography.Text>{item.file_name}</Typography.Text>
          <Typography.Text type="secondary">{item.id}</Typography.Text>
        </Space>
      ),
    },
    {
      key: "type",
      title: "类型",
      width: 100,
      render: (item) => item.file_type?.toUpperCase() || "—",
    },
    {
      key: "size",
      title: "大小",
      width: 110,
      render: (item) => formatBytes(item.file_size_bytes),
    },
    {
      key: "status",
      title: "解析状态",
      width: 130,
      render: (item) => (
        <Tag
          color={
            item.parse_status === "ready"
              ? "green"
              : item.parse_status === "failed"
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
            )[item.parse_status]
          }
        </Tag>
      ),
    },
    {
      key: "chunks",
      title: "分块数",
      width: 100,
      render: (item) => item.chunk_count ?? "—",
    },
    {
      key: "created",
      title: "上传时间",
      minWidth: 180,
      render: (item) => formatDateTime(item.created_at),
    },
  ];
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
      <DataTable
        rows={pagedRows}
        rowKey={(item) => item.id}
        columns={columns}
        selectable={false}
        loading={documents.isLoading}
        error={
          documents.error
            ? getErrorMessage(documents.error, "文档列表加载失败")
            : null
        }
        onRetry={() => void documents.refetch()}
        emptyText="还没有文档，上传后可进行解析和问答"
        tableLabel="知识库文档列表"
        preserveTableOnEmpty
        pagination={{
          page,
          pageSize,
          total: rows.length,
          onPageChange: setPage,
          onPageSizeChange: (next) => {
            setPageSize(next);
            setPage(1);
          },
        }}
        renderRowActions={(item) => (
          <ListRowActions>
            <ListRowActionButton
              status="danger"
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
            </ListRowActionButton>
          </ListRowActions>
        )}
      />
    </Space>
  );
}
