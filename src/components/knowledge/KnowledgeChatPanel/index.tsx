import { withId } from "@/lib/id";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Spin } from "@arco-design/web-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listModels } from "@/api/ai-services/models";
import {
  deleteKnowledgeBaseSession,
  listKnowledgeBaseCitations,
  listKnowledgeBaseSessionMessages,
  listKnowledgeBaseSessions,
  type KBCitation as Citation,
  type KBSession as Session,
  type KBSessionMessage as SessionMessage,
} from "@/api/knowledge";

import { getReadyModelOptions } from "@/lib/model-catalog";
import { KnowledgeCitationsDrawer } from "./KnowledgeCitationsDrawer";
import { KnowledgeConversation } from "./KnowledgeConversation";
import { KnowledgeSessionsSidebar } from "./KnowledgeSessionsSidebar";
import { toThreadMessage, type QueryMode } from "./knowledgeQueryAdapter";
import styles from "./index.module.css";

export function KnowledgeChatPanel({
  kbId,
  defaultTopK = 5,
  defaultInferenceService,
}: {
  kbId: string;
  defaultTopK?: number;
  defaultInferenceService?: string;
}) {
  const qc = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const [draftVersion, setDraftVersion] = useState(0);
  const [mode, setMode] = useState<QueryMode>("sync");
  const [topK, setTopK] = useState(defaultTopK);
  const [inferenceServiceName, setInferenceServiceName] = useState<string>();
  const [citationsVisible, setCitationsVisible] = useState(false);
  const inferenceModels = useQuery({
    meta: {
      errorNotification: {
        id: withId("knowledge-models", kbId),
        action: "推理模型列表加载",
        fallback: "将使用知识库或平台默认模型",
      },
    },
    queryKey: ["models", "knowledge-base-query", "text-generation"],
    queryFn: () => listModels({ limit: 100, capability: "text-generation", status: "ready" }),
  });
  const inferenceModelOptions = useMemo(
    () => getReadyModelOptions(inferenceModels.data?.items, "text-generation"),
    [inferenceModels.data?.items],
  );
  useEffect(() => {
    if (
      inferenceServiceName &&
      inferenceModels.data &&
      !inferenceModelOptions.some((option) => option.value === inferenceServiceName)
    ) {
      setInferenceServiceName(undefined);
    }
  }, [inferenceModelOptions, inferenceModels.data, inferenceServiceName]);
  const sessions = useQuery({
    meta: { errorNotification: { id: withId("knowledge-sessions", kbId), action: "会话列表加载" } },
    queryKey: ["knowledge-base-sessions", kbId],
    queryFn: async () => {
      const items: Session[] = [];
      let cursor: string | undefined;
      do {
        const data = await listKnowledgeBaseSessions(kbId, { limit: 100, cursor });
        items.push(...data.items);
        cursor = data.next_cursor ?? undefined;
      } while (cursor);
      return items;
    },
  });
  const messages = useQuery({
    meta: {
      errorNotification: {
        id: withId("knowledge-messages", kbId, activeSessionId ?? "none"),
        action: "会话消息加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["knowledge-base-session-messages", kbId, activeSessionId],
    enabled: Boolean(activeSessionId),
    queryFn: async () => {
      const items: SessionMessage[] = [];
      let cursor: string | undefined;
      do {
        const data = await listKnowledgeBaseSessionMessages(kbId, activeSessionId!, {
          limit: 100,
          cursor,
        });
        items.push(...data.items);
        cursor = data.next_cursor ?? undefined;
      } while (cursor);
      return items;
    },
  });
  const citations = useQuery({
    meta: {
      errorNotification: { id: withId("knowledge-citations", kbId), action: "引用记录加载" },
    },
    queryKey: ["knowledge-base-citations", kbId],
    enabled: citationsVisible,
    queryFn: async () => {
      const items: Citation[] = [];
      let cursor: string | undefined;
      do {
        const data = await listKnowledgeBaseCitations(kbId, { limit: 100, cursor });
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
    meta: {
      feedback: {
        channel: "notification",
        id: "knowledge-session-delete",
        action: "删除会话",
        successText: "会话已删除",
        errorFallback: "删除会话失败",
      },
    },
    mutationFn: (session: Session) => deleteKnowledgeBaseSession(kbId, session.id),
    onSuccess: (_, session) => {
      if (activeSessionId === session.id) {
        setActiveSessionId(undefined);
        setDraftVersion((current) => current + 1);
      }
      void qc.invalidateQueries({ queryKey: ["knowledge-base-sessions", kbId] });
      void qc.invalidateQueries({ queryKey: ["knowledge-base-citations", kbId] });
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
        {!inferenceModels.error &&
        !inferenceModels.isLoading &&
        inferenceModelOptions.length === 0 ? (
          <Alert
            type="warning"
            showIcon
            content="暂无已就绪的文本生成模型，将使用知识库或平台默认模型"
          />
        ) : null}
        <div className={styles.chatWorkspace}>
          <KnowledgeSessionsSidebar
            sessions={sessions.data}
            loading={sessions.isLoading}
            error={sessions.error}
            activeSessionId={activeSessionId}
            deletingSessionId={deleteSession.isPending ? deleteSession.variables?.id : undefined}
            onNew={addSession}
            onSelect={(sessionId) => {
              setActiveSessionId(sessionId);
              setCitationsVisible(false);
            }}
            onDelete={(session) => deleteSession.mutateAsync(session)}
            onViewCitations={() => setCitationsVisible(true)}
          />
          <div className={styles.conversationArea}>
            {activeSessionId && messages.isLoading ? (
              <div className={styles.conversationState}>
                <Spin />
              </div>
            ) : activeSessionId && messages.error ? (
              <div className={styles.conversationState} />
            ) : (
              <KnowledgeConversation
                key={sessionKey}
                kbId={kbId}
                sessionId={activeSessionId}
                initialMessages={initialMessages}
                mode={mode}
                topK={topK}
                onModeChange={setMode}
                onTopKChange={setTopK}
                inferenceServiceName={inferenceServiceName}
                inferenceModelOptions={inferenceModelOptions}
                inferenceModelsLoading={inferenceModels.isLoading}
                defaultInferenceService={defaultInferenceService}
                onInferenceServiceChange={setInferenceServiceName}
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
        onCancel={() => setCitationsVisible(false)}
        onSelectSession={(sessionId) => {
          setActiveSessionId(sessionId);
          setCitationsVisible(false);
        }}
      />
    </>
  );
}
