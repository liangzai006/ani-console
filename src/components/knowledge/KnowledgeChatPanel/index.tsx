import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  InputNumber,
  Message,
  Radio,
  Spin,
  Typography,
} from "@arco-design/web-react";
import { useCallback, useMemo, useState } from "react";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { getErrorMessage } from "@/lib/errors";
import { KnowledgeCitationsDrawer } from "./KnowledgeCitationsDrawer";
import { KnowledgeConversation } from "./KnowledgeConversation";
import { KnowledgeSessionsSidebar } from "./KnowledgeSessionsSidebar";
import { toThreadMessage, type QueryMode } from "./knowledgeQueryAdapter";
import styles from "./index.module.css";

type Citation = components["schemas"]["KBCitation"];
type Session = components["schemas"]["KBSession"];
type SessionMessage = components["schemas"]["KBSessionMessage"];

export function KnowledgeChatPanel({
  kbId,
  defaultTopK = 5,
}: {
  kbId: string;
  defaultTopK?: number;
}) {
  const qc = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const [draftVersion, setDraftVersion] = useState(0);
  const [mode, setMode] = useState<QueryMode>("sync");
  const [topK, setTopK] = useState(defaultTopK);
  const [citationsVisible, setCitationsVisible] = useState(false);
  const sessions = useQuery({
    queryKey: ["knowledge-base-sessions", kbId],
    queryFn: async () => {
      const items: Session[] = [];
      let cursor: string | undefined;
      do {
        const { data, error } = await servicesApi.GET("/knowledge-bases/{kb_id}/sessions", {
          params: { path: { kb_id: kbId }, query: { limit: 100, cursor } },
        });
        if (error || !data) throw error ?? new Error("会话列表未返回结果");
        items.push(...data.items);
        cursor = data.next_cursor ?? undefined;
      } while (cursor);
      return items;
    },
  });
  const messages = useQuery({
    queryKey: ["knowledge-base-session-messages", kbId, activeSessionId],
    enabled: Boolean(activeSessionId),
    queryFn: async () => {
      const items: SessionMessage[] = [];
      let cursor: string | undefined;
      do {
        const { data, error } = await servicesApi.GET(
          "/knowledge-bases/{kb_id}/sessions/{session_id}/messages",
          {
            params: {
              path: { kb_id: kbId, session_id: activeSessionId! },
              query: { limit: 100, cursor },
            },
          },
        );
        if (error || !data) throw error ?? new Error("会话消息未返回结果");
        items.push(...data.items);
        cursor = data.next_cursor ?? undefined;
      } while (cursor);
      return items;
    },
  });
  const citations = useQuery({
    queryKey: ["knowledge-base-citations", kbId],
    enabled: citationsVisible,
    queryFn: async () => {
      const items: Citation[] = [];
      let cursor: string | undefined;
      do {
        const { data, error } = await servicesApi.GET("/knowledge-bases/{kb_id}/citations", {
          params: { path: { kb_id: kbId }, query: { limit: 100, cursor } },
        });
        if (error || !data) throw error ?? new Error("引用列表未返回结果");
        items.push(...data.items);
        cursor = data.next_cursor ?? undefined;
      } while (cursor);
      return { items };
    },
  });
  const initialMessages = useMemo(
    () => (messages.data ?? []).map(toThreadMessage),
    [messages.data],
  );
  const deleteSession = useMutation({
    mutationFn: async (session: Session) => {
      const { error } = await servicesApi.DELETE("/knowledge-bases/{kb_id}/sessions/{session_id}", {
        params: { path: { kb_id: kbId, session_id: session.id } },
      });
      if (error) throw error;
    },
    onSuccess: (_, session) => {
      Message.success("会话已删除");
      if (activeSessionId === session.id) {
        setActiveSessionId(undefined);
        setDraftVersion((current) => current + 1);
      }
      void qc.invalidateQueries({ queryKey: ["knowledge-base-sessions", kbId] });
      void qc.invalidateQueries({ queryKey: ["knowledge-base-citations", kbId] });
    },
    onError: (error) => {
      const message = getErrorMessage(error, "删除会话失败");
      Message.error(message);
    },
  });

  const addSession = () => {
    setActiveSessionId(undefined);
    setDraftVersion((current) => current + 1);
    setCitationsVisible(false);
  };
  const handleComplete = useCallback(
    (sessionId?: string) => {
      void qc.invalidateQueries({ queryKey: ["knowledge-base-sessions", kbId] });
      void qc.invalidateQueries({ queryKey: ["knowledge-base-citations", kbId] });
      if (sessionId) {
        void qc.invalidateQueries({
          queryKey: ["knowledge-base-session-messages", kbId, sessionId],
        });
        if (sessionId !== activeSessionId) setActiveSessionId(sessionId);
      }
    },
    [activeSessionId, kbId, qc],
  );
  const sessionKey = activeSessionId ?? `draft-${draftVersion}`;

  return (
    <>
      <div className={styles.panel}>
        <Alert
          type="info"
          showIcon
          content="仅已完成解析和索引的文档会参与回答。会话与消息历史已由服务端保存，可在左侧切换或删除。"
        />
        <div className={styles.chatWorkspace}>
          <KnowledgeSessionsSidebar
            sessions={sessions.data}
            loading={sessions.isLoading}
            error={sessions.error}
            activeSessionId={activeSessionId}
            deletingSessionId={deleteSession.isPending ? deleteSession.variables?.id : undefined}
            onRetry={() => void sessions.refetch()}
            onNew={addSession}
            onSelect={(sessionId) => {
              setActiveSessionId(sessionId);
              setCitationsVisible(false);
            }}
            onDelete={(session) => deleteSession.mutateAsync(session)}
          />
          <div className={styles.conversationArea}>
            <div className={styles.queryToolbar}>
              <div className={styles.queryOptions}>
                <Radio.Group type="button" value={mode} onChange={setMode}>
                  <Radio value="stream">流式</Radio>
                  <Radio value="sync">同步</Radio>
                </Radio.Group>
                <label className={styles.topKControl}>
                  <Typography.Text type="secondary">TopK</Typography.Text>
                  <InputNumber
                    size="small"
                    min={1}
                    max={20}
                    precision={0}
                    value={topK}
                    onChange={(value) => setTopK(Number(value) || 5)}
                  />
                </label>
              </div>
              <Button type="text" onClick={() => setCitationsVisible(true)}>
                查看本库全部引用
              </Button>
            </div>
            {activeSessionId && messages.isLoading ? (
              <div className={styles.conversationState}>
                <Spin />
              </div>
            ) : activeSessionId && messages.error ? (
              <div className={styles.conversationState}>
                <Alert
                  type="error"
                  showIcon
                  content={getErrorMessage(messages.error, "会话消息加载失败")}
                />
                <Button onClick={() => void messages.refetch()}>重试</Button>
              </div>
            ) : (
              <KnowledgeConversation
                key={sessionKey}
                kbId={kbId}
                sessionKey={sessionKey}
                sessionId={activeSessionId}
                initialMessages={initialMessages}
                mode={mode}
                topK={topK}
                onComplete={handleComplete}
              />
            )}
          </div>
        </div>
      </div>
      <KnowledgeCitationsDrawer
        visible={citationsVisible}
        citations={citations.data?.items}
        loading={citations.isLoading}
        error={citations.error}
        onRetry={() => void citations.refetch()}
        onCancel={() => setCitationsVisible(false)}
        onSelectSession={(sessionId) => {
          setActiveSessionId(sessionId);
          setCitationsVisible(false);
        }}
      />
    </>
  );
}
