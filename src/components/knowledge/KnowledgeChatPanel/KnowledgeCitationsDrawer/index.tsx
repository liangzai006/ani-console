import { Button, Drawer, Empty, Spin, Typography } from "@arco-design/web-react";
import type { KBCitation as Citation } from "@/api/knowledge";
import { formatDateTime } from "@/lib/format";
import styles from "./index.module.css";

export function KnowledgeCitationsDrawer({
  visible,
  citations,
  loading,
  error,
  onCancel,
  onSelectSession,
}: {
  visible: boolean;
  citations?: Citation[];
  loading: boolean;
  error: unknown;
  onCancel: () => void;
  onSelectSession: (sessionId: string) => void;
}) {
  return (
    <Drawer width={560} title="本库全部引用" visible={visible} footer={null} onCancel={onCancel}>
      {loading ? (
        <div className={styles.state}>
          <Spin />
        </div>
      ) : error ? (
        <div className={styles.state} />
      ) : citations?.length ? (
        <div className={styles.list}>
          {citations.map((citation) => (
            <article key={citation.id} className={styles.item}>
              <div className={styles.header}>
                <Typography.Text bold>{citation.file_name}</Typography.Text>
                <Typography.Text type="secondary">
                  {citation.page ? `第 ${citation.page} 页 · ` : ""}
                  {citation.score == null ? "" : `匹配度 ${citation.score.toFixed(3)} · `}
                  {formatDateTime(citation.created_at)}
                </Typography.Text>
              </div>
              <Typography.Paragraph className="mb-0!" type="secondary">
                {citation.content}
              </Typography.Paragraph>
              {citation.session_id ? (
                <Button
                  type="text"
                  size="small"
                  onClick={() => onSelectSession(citation.session_id!)}
                >
                  打开所属会话
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <Empty description="暂无引用记录" />
      )}
    </Drawer>
  );
}
