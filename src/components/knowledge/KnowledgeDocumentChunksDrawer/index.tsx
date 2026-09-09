import { Alert, Button, Drawer, Empty, List, Spin, Tag, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";

type KBDocument = components["schemas"]["KBDocument"];
type KBChunk = components["schemas"]["KBChunk"];

const CHUNK_TYPE_LABELS: Record<KBChunk["chunk_type"], string> = {
  child: "子分块",
  parent: "父分块",
  doc_summary: "文档摘要",
};

export function KnowledgeDocumentChunksDrawer({
  kbId,
  document,
  visible,
  onCancel,
}: {
  kbId: string;
  document?: KBDocument;
  visible: boolean;
  onCancel: () => void;
}) {
  const chunks = useQuery({
    queryKey: ["knowledge-base-document-chunks", kbId, document?.id],
    enabled: visible && Boolean(document),
    queryFn: async () => {
      const items: KBChunk[] = [];
      let cursor: string | undefined;
      do {
        const { data, error } = await servicesApi.GET(
          "/knowledge-bases/{kb_id}/documents/{doc_id}/chunks",
          {
            params: {
              path: { kb_id: kbId, doc_id: document!.id },
              query: { limit: 100, cursor },
            },
          },
        );
        if (error || !data) throw error ?? new Error("文档分块未返回结果");
        items.push(...data.items);
        cursor = data.next_cursor ?? undefined;
      } while (cursor);
      return items;
    },
  });

  return (
    <Drawer
      width={680}
      title={document ? `${document.file_name} · 分块明细` : "文档分块明细"}
      visible={visible}
      footer={null}
      onCancel={onCancel}
      unmountOnExit
    >
      {chunks.isLoading ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : chunks.error ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <Alert
            type="error"
            showIcon
            content={getErrorMessage(chunks.error, "文档分块加载失败")}
          />
          <Button size="small" onClick={() => void chunks.refetch()}>
            重试
          </Button>
        </div>
      ) : (
        <List
          bordered
          dataSource={chunks.data ?? []}
          noDataElement={<Empty description="暂无可查看的文档分块" />}
          render={(chunk: KBChunk) => (
            <List.Item key={chunk.id}>
              <div className="min-w-0 w-full">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Tag color="arcoblue">{CHUNK_TYPE_LABELS[chunk.chunk_type]}</Tag>
                  <Typography.Text type="secondary">
                    {chunk.page_number ? `第 ${chunk.page_number} 页 · ` : ""}
                    {chunk.token_count ? `${chunk.token_count} tokens · ` : ""}
                    {formatDateTime(chunk.created_at)}
                  </Typography.Text>
                </div>
                <Typography.Paragraph className="mb-0! whitespace-pre-wrap break-words">
                  {chunk.content}
                </Typography.Paragraph>
                {chunk.parent_content ? (
                  <Typography.Paragraph className="mt-3 mb-0!" type="secondary">
                    父级上下文：{chunk.parent_content}
                  </Typography.Paragraph>
                ) : null}
              </div>
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
}
