import { withId } from "@/lib/id";
import { Collapse, Drawer, Empty, Spin, Tag, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listKnowledgeBaseDocumentChunks, type KBChunk, type KBDocument } from "@/api/knowledge";
import { formatDateTime } from "@/lib/format";
import styles from "./index.module.css";

const CHUNK_TYPE_LABELS: Record<KBChunk["chunk_type"], string> = {
  child: "子分块",
  parent: "父分块",
  doc_summary: "文档摘要",
};

const CollapseItem = Collapse.Item;
const numberFormatter = new Intl.NumberFormat("zh-CN");

interface ParentChunkGroup {
  key: string;
  parent?: KBChunk;
  parentContent?: string;
  children: KBChunk[];
  order: number;
}

function groupChunks(chunks: KBChunk[]) {
  const summaries: KBChunk[] = [];
  const groupsByParentId = new Map<string, ParentChunkGroup>();

  chunks.forEach((chunk, index) => {
    if (chunk.chunk_type === "doc_summary") {
      summaries.push(chunk);
      return;
    }
    if (chunk.chunk_type === "parent") {
      const existing = groupsByParentId.get(chunk.id);
      groupsByParentId.set(chunk.id, {
        key: chunk.id,
        parent: chunk,
        parentContent: chunk.content,
        children: existing?.children ?? [],
        order: Math.min(existing?.order ?? index, index),
      });
      return;
    }

    const parentId = chunk.parent_chunk_id ?? `orphan-${chunk.id}`;
    const existing = groupsByParentId.get(parentId);
    if (existing) {
      existing.children.push(chunk);
      existing.order = Math.min(existing.order, index);
      if (!existing.parentContent && chunk.parent_content) {
        existing.parentContent = chunk.parent_content;
      }
      return;
    }
    groupsByParentId.set(parentId, {
      key: parentId,
      parentContent: chunk.parent_content ?? undefined,
      children: [chunk],
      order: index,
    });
  });

  return {
    summaries,
    groups: [...groupsByParentId.values()].sort((left, right) => left.order - right.order),
  };
}

function ChunkMeta({ chunk }: { chunk: KBChunk }) {
  return (
    <Typography.Text type="secondary" className={styles.meta}>
      {chunk.page_number ? `第 ${chunk.page_number} 页 · ` : ""}
      {chunk.token_count ? `${numberFormatter.format(chunk.token_count)} tokens · ` : ""}
      {formatDateTime(chunk.created_at)}
    </Typography.Text>
  );
}

function getChunkName(chunk?: KBChunk) {
  const sectionPath = chunk?.custom_metadata?.section_path;
  return typeof sectionPath === "string" && sectionPath.trim() ? sectionPath.trim() : undefined;
}

function ParentChunkSection({ group, index }: { group: ParentChunkGroup; index: number }) {
  const content = group.parent?.content ?? group.parentContent;
  const childCount = group.children.length;
  const parentLabel = `分段-${String(index + 1).padStart(2, "0")}`;
  const parentName = getChunkName(group.parent) ?? getChunkName(group.children[0]);
  return (
    <section className={styles.parentSection}>
      <div className={styles.parentHeading}>
        <div className={styles.parentTitle}>
          <Tag color="arcoblue">父分段</Tag>
          <Typography.Text bold>{parentName ?? parentLabel}</Typography.Text>
          <Typography.Text type="secondary">
            · {parentName ? `${parentLabel} · ` : ""}
            {numberFormatter.format(content?.length ?? 0)} 字符 · {childCount} 个子分段
          </Typography.Text>
        </div>
        {group.parent ? <ChunkMeta chunk={group.parent} /> : <Tag color="orange">父分段缺失</Tag>}
      </div>
      {content ? (
        <Typography.Paragraph className={styles.parentContent}>{content}</Typography.Paragraph>
      ) : null}
      {childCount ? (
        <Collapse
          className={styles.childrenCollapse}
          bordered={false}
          defaultActiveKey="children"
          expandIconPosition="right"
          triggerRegion="header"
        >
          <CollapseItem header={`${childCount} 个子分段`} name="children">
            <div className={styles.childList}>
              {group.children.map((child, childIndex) => (
                <article className={styles.childItem} key={child.id}>
                  <div className={styles.childHeading}>
                    <div className={styles.childTitle}>
                      <Tag color="green">子分段</Tag>
                      <Typography.Text bold>
                        {getChunkName(child) ?? `分段-${childIndex + 1}`}
                      </Typography.Text>
                      {getChunkName(child) ? (
                        <Typography.Text type="secondary">分段-{childIndex + 1}</Typography.Text>
                      ) : null}
                    </div>
                    <ChunkMeta chunk={child} />
                  </div>
                  <Typography.Paragraph className={styles.childContent}>
                    {child.content}
                  </Typography.Paragraph>
                </article>
              ))}
            </div>
          </CollapseItem>
        </Collapse>
      ) : (
        <div className={styles.noChildren}>
          <Typography.Text type="secondary">暂无子分段</Typography.Text>
        </div>
      )}
    </section>
  );
}

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
    meta: {
      errorNotification: {
        id: withId("knowledge-chunks", kbId, document?.id ?? "none"),
        action: "文档分块加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["knowledge-base-document-chunks", kbId, document?.id],
    enabled: visible && Boolean(document),
    queryFn: async () => {
      const items: KBChunk[] = [];
      let cursor: string | undefined;
      do {
        const data = await listKnowledgeBaseDocumentChunks(kbId, document!.id, {
          limit: 100,
          cursor,
        });
        items.push(...data.items);
        cursor = data.next_cursor ?? undefined;
      } while (cursor);
      return items;
    },
  });
  const groupedChunks = groupChunks(chunks.data ?? []);
  return (
    <Drawer
      width={880}
      title={
        document
          ? `${document.file_name} · ${groupedChunks.groups.length} 个父分段`
          : "文档分段明细"
      }
      visible={visible}
      footer={null}
      onCancel={onCancel}
      unmountOnExit
    >
      {chunks.isLoading ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : (
        <div className={styles.content}>
          {groupedChunks.summaries.map((summary) => (
            <section className={styles.summary} key={summary.id}>
              <div className={styles.summaryHeading}>
                <Tag color="purple">{CHUNK_TYPE_LABELS.doc_summary}</Tag>
                <ChunkMeta chunk={summary} />
              </div>
              <Typography.Paragraph className={styles.summaryContent}>
                {summary.content}
              </Typography.Paragraph>
            </section>
          ))}
          {groupedChunks.groups.map((group, index) => (
            <ParentChunkSection group={group} index={index} key={group.key} />
          ))}
          {!groupedChunks.summaries.length && !groupedChunks.groups.length ? (
            <Empty description="暂无可查看的文档分段" />
          ) : null}
        </div>
      )}
    </Drawer>
  );
}
