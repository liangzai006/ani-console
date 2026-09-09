import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  type ThreadMessageLike,
  useAuiState,
  useLocalRuntime,
} from "@assistant-ui/react";
import { Button, Spin, Typography } from "@arco-design/web-react";
import { IconCheck, IconCopy, IconSend, IconStop } from "@arco-design/web-react/icon";
import { useMemo, useRef } from "react";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { KnowledgeMarkdownText } from "../../KnowledgeMarkdownText";
import { createKnowledgeBaseAdapter, type QueryMode } from "../knowledgeQueryAdapter";
import styles from "./index.module.css";

export function KnowledgeConversation({
  kbId,
  sessionKey,
  sessionId,
  initialMessages,
  mode,
  topK,
  onComplete,
}: {
  kbId: string;
  sessionKey: string;
  sessionId?: string;
  initialMessages: readonly ThreadMessageLike[];
  mode: QueryMode;
  topK: number;
  onComplete: (sessionId?: string) => void;
}) {
  const sessionIdRef = useRef(sessionId);
  const queryScope = useIdempotencyScope("knowledge-base-query", ["POST", kbId, sessionKey]);
  const adapter = useMemo(
    () => createKnowledgeBaseAdapter(kbId, sessionIdRef, mode, topK, queryScope, onComplete),
    [kbId, mode, onComplete, queryScope, topK],
  );
  const runtime = useLocalRuntime(adapter, { initialMessages });

  return (
    <div className={styles.conversationPane}>
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
              <Typography.Title heading={4} className="m-0!">
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
      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="not-last"
        className={styles.messageActions}
      >
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
