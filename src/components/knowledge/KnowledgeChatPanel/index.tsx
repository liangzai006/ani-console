import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  type ChatModelAdapter,
  type ThreadMessage,
  useAuiState,
  useLocalRuntime,
} from "@assistant-ui/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Alert,
  Button,
  Drawer,
  Empty,
  InputNumber,
  Radio,
  Spin,
  Typography,
} from "@arco-design/web-react";
import {
  IconCheck,
  IconCopy,
  IconPlus,
  IconSend,
  IconStop,
} from "@arco-design/web-react/icon";
import { useCallback, useMemo, useRef, useState } from "react";
import { SERVICES_API_BASE, servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/auth";
import { KnowledgeMarkdownText } from "../KnowledgeMarkdownText";
import styles from "./index.module.css";

type Answer = components["schemas"]["KBQueryResponse"];
type Citation = components["schemas"]["KBCitation"];
type QueryMode = "sync" | "stream";
type LocalChatSession = {
  id: string;
  title: string;
  messageCount: number;
};

function createLocalSession(): LocalChatSession {
  return {
    id: crypto.randomUUID(),
    title: "新会话",
    messageCount: 0,
  };
}

function getLatestQuestion(messages: readonly ThreadMessage[]) {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  return (
    latestUserMessage?.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim() ?? ""
  );
}

function formatSources(sources: Answer["sources"]) {
  if (!sources.length) return "";
  return `\n\n参考来源\n${sources
    .map((source, index) => {
      const title = source.file_name || source.doc_id || `来源 ${index + 1}`;
      const page = source.page ? ` · 第 ${source.page} 页` : "";
      const score = source.score == null ? "" : ` · 匹配度 ${source.score.toFixed(3)}`;
      return `[${index + 1}] ${title}${page}${score}\n${source.content || "-"}`;
    })
    .join("\n\n")}`;
}

function formatAnswer(answer: Answer) {
  return `${answer.answer}${formatSources(answer.sources)}`;
}

function parseSseBlock(block: string) {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  return { event, data: data.join("\n") };
}

function createKnowledgeBaseAdapter(
  kbId: string,
  sessionIdRef: { current?: string },
  mode: QueryMode,
  topK: number,
  onQuestion: (question: string) => void,
  onAnswer: () => void,
): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const question = getLatestQuestion(messages);
      if (!question) throw new Error("请输入问题");
      onQuestion(question);
      if (mode === "stream") {
        const params = new URLSearchParams({ question, top_k: String(topK) });
        if (sessionIdRef.current) params.set("session_id", sessionIdRef.current);
        const token = useAuthStore.getState().getAccessToken();
        const response = await fetch(
          `${SERVICES_API_BASE}/knowledge-bases/${encodeURIComponent(kbId)}/query/stream?${params}`,
          {
            credentials: "include",
            signal: abortSignal,
            headers: {
              Accept: "text/event-stream",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );
        if (!response.ok || !response.body) {
          let message = `流式问答失败（HTTP ${response.status}）`;
          try {
            const body = (await response.json()) as { message?: string; detail?: string };
            message = body.message || body.detail || message;
          } catch {
            // Keep the HTTP fallback when the response is not JSON.
          }
          throw new Error(message);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        let sources: Answer["sources"] = [];
        try {
          while (true) {
            const { value, done } = await reader.read();
            buffer += decoder.decode(value, { stream: !done });
            const blocks = buffer.split(/\r?\n\r?\n/);
            buffer = blocks.pop() ?? "";
            if (done && buffer.trim()) blocks.push(buffer);
            if (done) buffer = "";
            for (const block of blocks) {
              const event = parseSseBlock(block);
              if (!event.data) continue;
              const payload = JSON.parse(event.data) as Record<string, unknown>;
              if (event.event === "token") {
                text += typeof payload.delta === "string" ? payload.delta : "";
              } else if (event.event === "sources") {
                sources = Array.isArray(payload) ? (payload as Answer["sources"]) : [];
              } else if (event.event === "done") {
                if (typeof payload.session_id === "string") {
                  sessionIdRef.current = payload.session_id;
                }
              } else if (event.event === "error") {
                throw new Error(
                  typeof payload.message === "string" ? payload.message : "流式问答失败",
                );
              }
              yield { content: [{ type: "text", text: `${text}${formatSources(sources)}` }] };
            }
            if (done) break;
          }
        } finally {
          reader.releaseLock();
        }
        onAnswer();
        return;
      }

      const { data, error } = await servicesApi.POST(
        "/knowledge-bases/{kb_id}/query",
        {
          params: { path: { kb_id: kbId } },
          body: {
            question,
            idempotency_key: newIdempotencyKey(),
            session_id: sessionIdRef.current,
            top_k: topK,
          },
        },
      );
      if (error || !data) throw error ?? new Error("问答未返回结果");
      sessionIdRef.current = data.session_id;
      onAnswer();
      yield { content: [{ type: "text", text: formatAnswer(data) }] };
    },
  };
}

function SessionThread({
  kbId,
  sessionKey,
  active,
  mode,
  topK,
  onQuestion,
  onAnswer,
}: {
  kbId: string;
  sessionKey: string;
  active: boolean;
  mode: QueryMode;
  topK: number;
  onQuestion: (sessionId: string, question: string) => void;
  onAnswer: (sessionId: string) => void;
}) {
  const sessionIdRef = useRef<string>();
  const adapter = useMemo(
    () =>
      createKnowledgeBaseAdapter(
        kbId,
        sessionIdRef,
        mode,
        topK,
        (question) => onQuestion(sessionKey, question),
        () => onAnswer(sessionKey),
      ),
    [kbId, mode, onAnswer, onQuestion, sessionKey, topK],
  );
  const runtime = useLocalRuntime(adapter);

  return (
    <div className={styles.conversationPane} hidden={!active}>
      <AssistantRuntimeProvider runtime={runtime}>
        <KnowledgeThread />
      </AssistantRuntimeProvider>
    </div>
  );
}

function KnowledgeThread() {
  return (
    <ThreadPrimitive.Root className={styles.threadRoot}>
      <ThreadPrimitive.Viewport className={styles.viewport}>
        <div className={styles.threadContent}>
          <AuiIf condition={(state) => state.thread.isEmpty}>
            <div className={styles.welcome}>
              <Typography.Title heading={4} className="!m-0">
                想从知识库中了解什么？
              </Typography.Title>
              <Typography.Text type="secondary">
                回答将基于已完成解析和索引的文档，并附带检索来源。
              </Typography.Text>
              <div className={styles.suggestions}>
                {["概括知识库的主要内容", "列出最重要的三个结论", "有哪些值得关注的风险？"].map(
                  (prompt) => (
                    <ThreadPrimitive.Suggestion
                      key={prompt}
                      prompt={prompt}
                      send
                      className={styles.suggestion}
                    >
                      {prompt}
                    </ThreadPrimitive.Suggestion>
                  ),
                )}
              </div>
            </div>
          </AuiIf>

          <div className={styles.messages}>
            <ThreadPrimitive.Messages>{() => <ThreadMessage />}</ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.ViewportFooter className={styles.footer}>
            <AuiIf condition={(state) => state.thread.isRunning}>
              <div className={styles.generating}>
                <Spin size={14} /> 正在检索知识库并生成回答…
              </div>
            </AuiIf>
            <ComposerPrimitive.Root className={styles.composer}>
              <ComposerPrimitive.Input
                aria-label="知识库问题"
                placeholder="输入问题，Enter 发送，Shift + Enter 换行"
                rows={1}
                className={styles.composerInput}
              />
              <div className={styles.composerActions}>
                <Typography.Text type="secondary">AI 生成内容仅供参考</Typography.Text>
                <AuiIf condition={(state) => !state.thread.isRunning}>
                  <ComposerPrimitive.Send asChild>
                    <Button
                      type="primary"
                      shape="circle"
                      icon={<IconSend />}
                      aria-label="发送问题"
                    />
                  </ComposerPrimitive.Send>
                </AuiIf>
                <AuiIf condition={(state) => state.thread.isRunning}>
                  <ComposerPrimitive.Cancel asChild>
                    <Button shape="circle" icon={<IconStop />} aria-label="停止生成" />
                  </ComposerPrimitive.Cancel>
                </AuiIf>
              </div>
            </ComposerPrimitive.Root>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function ThreadMessage() {
  const role = useAuiState((state) => state.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className={styles.userMessage}>
      <div className={styles.userBubble}>
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className={styles.assistantMessage}>
      <div className={styles.assistantBubble}>
        <MessagePrimitive.Parts>
          {({ part }) => (part.type === "text" ? <KnowledgeMarkdownText /> : null)}
        </MessagePrimitive.Parts>
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className={styles.messageError}>
            <ErrorPrimitive.Message />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>
      <ActionBarPrimitive.Root hideWhenRunning autohide="not-last" className={styles.messageActions}>
        <ActionBarPrimitive.Copy asChild>
          <Button type="text" size="mini">
            <AuiIf condition={(state) => state.message.isCopied}>
              <IconCheck />
            </AuiIf>
            <AuiIf condition={(state) => !state.message.isCopied}>
              <IconCopy />
            </AuiIf>
            复制
          </Button>
        </ActionBarPrimitive.Copy>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

export function KnowledgeChatPanel({
  kbId,
  defaultTopK = 5,
}: {
  kbId: string;
  defaultTopK?: number;
}) {
  const [sessions, setSessions] = useState<LocalChatSession[]>(() => [createLocalSession()]);
  const [activeSessionId, setActiveSessionId] = useState(() => sessions[0].id);
  const [mode, setMode] = useState<QueryMode>("sync");
  const [topK, setTopK] = useState(defaultTopK);
  const [citationsVisible, setCitationsVisible] = useState(false);
  const citations = useQuery({
    queryKey: ["knowledge-base-citations", kbId],
    enabled: citationsVisible,
    queryFn: async () => {
      const items: Citation[] = [];
      let cursor: string | undefined;
      do {
        const { data, error } = await servicesApi.GET(
          "/knowledge-bases/{kb_id}/citations",
          { params: { path: { kb_id: kbId }, query: { limit: 100, cursor } } },
        );
        if (error || !data) throw error ?? new Error("引用列表未返回结果");
        items.push(...data.items);
        cursor = data.next_cursor ?? undefined;
      } while (cursor);
      return { items };
    },
  });

  const addSession = () => {
    const session = createLocalSession();
    setSessions((current) => [session, ...current]);
    setActiveSessionId(session.id);
  };

  const handleQuestion = useCallback((sessionId: string, question: string) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              title: session.messageCount === 0 ? question : session.title,
              messageCount: session.messageCount + 1,
            }
          : session,
      ),
    );
  }, []);

  const handleAnswer = useCallback((sessionId: string) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, messageCount: session.messageCount + 1 }
          : session,
      ),
    );
  }, []);

  return (
    <>
      <div className={styles.panel}>
      <Alert
        type="info"
        showIcon
        content="仅已完成解析和索引的文档会参与回答。当前会话列表临时保存在本页面，刷新后不会保留。"
      />
      <div className={styles.chatWorkspace}>
        <aside className={styles.sessionSidebar} aria-label="问答会话">
          <Button type="primary" long icon={<IconPlus />} onClick={addSession}>
            新会话
          </Button>
          <div className={styles.sessionList}>
            {sessions.length ? (
              sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={clsx(
                    styles.sessionItem,
                    session.id === activeSessionId && styles.sessionItemActive,
                  )}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <span className={styles.sessionTitle}>{session.title}</span>
                  <span className={styles.sessionMeta}>
                    {session.messageCount ? `${session.messageCount} 条消息` : "尚未提问"}
                  </span>
                </button>
              ))
            ) : (
              <Empty description="暂无会话" />
            )}
          </div>
        </aside>
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
            {/* TODO: 后端引用列表接口实现后恢复“查看本库全部引用”入口。 */}
          </div>
          {/* TODO: 后端开放会话列表与消息历史接口后，替换为 RemoteThreadListAdapter/ThreadHistoryAdapter。 */}
          {sessions.map((session) => (
            <SessionThread
              key={session.id}
              kbId={kbId}
              sessionKey={session.id}
              active={session.id === activeSessionId}
              mode={mode}
              topK={topK}
              onQuestion={handleQuestion}
              onAnswer={handleAnswer}
            />
          ))}
        </div>
      </div>
      </div>
      <Drawer
        width={560}
        title="本库全部引用"
        visible={citationsVisible}
        footer={null}
        onCancel={() => setCitationsVisible(false)}
      >
        {citations.isLoading ? (
          <div className={styles.citationState}><Spin /></div>
        ) : citations.error ? (
          <Alert
            type="error"
            showIcon
            content={getErrorMessage(citations.error, "引用列表加载失败")}
          />
        ) : citations.data?.items.length ? (
          <div className={styles.citationList}>
            {citations.data.items.map((citation: Citation) => (
              <article key={citation.id} className={styles.citationItem}>
                <div className={styles.citationHeader}>
                  <Typography.Text bold>{citation.file_name}</Typography.Text>
                  <Typography.Text type="secondary">
                    {citation.page ? `第 ${citation.page} 页 · ` : ""}
                    {citation.score == null ? "" : `匹配度 ${citation.score.toFixed(3)} · `}
                    {formatDateTime(citation.created_at)}
                  </Typography.Text>
                </div>
                <Typography.Paragraph className="!mb-0" type="secondary">
                  {citation.content}
                </Typography.Paragraph>
              </article>
            ))}
          </div>
        ) : (
          <Empty description="暂无引用记录" />
        )}
      </Drawer>
    </>
  );
}
