import { Button, Empty, Modal, Spin } from "@arco-design/web-react";
import { IconPlus } from "@arco-design/web-react/icon";
import clsx from "clsx";
import type { KBSession as Session } from "@/api/knowledge";
import { formatDateTime } from "@/lib/format";
import styles from "./index.module.css";

export function KnowledgeSessionsSidebar({
  sessions,
  loading,
  error,
  activeSessionId,
  deletingSessionId,
  onNew,
  onSelect,
  onDelete,
  onViewCitations,
}: {
  sessions?: Session[];
  loading: boolean;
  error: unknown;
  activeSessionId?: string;
  deletingSessionId?: string;
  onNew: () => void;
  onSelect: (sessionId: string) => void;
  onDelete: (session: Session) => Promise<void>;
  onViewCitations: () => void;
}) {
  return (
    <aside className={styles.sidebar} aria-label="问答会话">
      <Button type="primary" long icon={<IconPlus />} onClick={onNew}>
        新会话
      </Button>
      <div className={styles.list}>
        {!activeSessionId ? (
          <button type="button" className={clsx(styles.item, styles.itemActive)} onClick={onNew}>
            <span className={styles.title}>新会话</span>
            <span className={styles.meta}>尚未提问</span>
          </button>
        ) : null}
        {loading ? (
          <div className={styles.state}>
            <Spin size={18} />
          </div>
        ) : error ? (
          <div className={styles.state} />
        ) : sessions?.length ? (
          sessions.map((session) => (
            <div key={session.id} className={styles.row}>
              <button
                type="button"
                className={clsx(styles.item, session.id === activeSessionId && styles.itemActive)}
                onClick={() => onSelect(session.id)}
              >
                <span className={styles.title}>{session.last_query || "新会话"}</span>
                <span className={styles.meta}>
                  {session.message_count ?? 0} 条消息 ·{" "}
                  {formatDateTime(session.last_active_at || session.created_at)}
                </span>
              </button>
              <Button
                type="text"
                size="mini"
                status="danger"
                className={styles.delete}
                aria-label={`删除会话：${session.last_query || session.id}`}
                loading={deletingSessionId === session.id}
                onClick={() =>
                  Modal.confirm({
                    title: "删除会话",
                    content: `确定删除会话「${session.last_query || session.id}」？`,
                    okButtonProps: { status: "danger" },
                    onOk: () => onDelete(session),
                  })
                }
              >
                删除
              </Button>
            </div>
          ))
        ) : (
          <Empty description="暂无历史会话" />
        )}
      </div>
      <Button type="text" long onClick={onViewCitations}>
        查看本库全部引用
      </Button>
    </aside>
  );
}
