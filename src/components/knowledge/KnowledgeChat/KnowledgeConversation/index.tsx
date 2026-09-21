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
import { Button, InputNumber, Select, Spin, Typography } from "@arco-design/web-react";
import { IconCheck, IconCopy, IconSend, IconStop } from "@arco-design/web-react/icon";
import { useMemo, useRef } from "react";
import { KnowledgeMarkdownText } from "../../KnowledgeMarkdownText";
import { createKnowledgeBaseAdapter, type QueryMode } from "../knowledgeQueryAdapter";
import styles from "./index.module.css";

export function KnowledgeConversation({
  kbId,
  sessionId,
  initialMessages,
  mode,
  topK,
  onModeChange,
  onTopKChange,
  inferenceServiceName,
  inferenceModelOptions,
  inferenceModelsLoading,
  defaultInferenceService,
  onInferenceServiceChange,
  onComplete,
}: {
  kbId: string;
  sessionId?: string;
  initialMessages: readonly ThreadMessageLike[];
  mode: QueryMode;
  topK: number;
  onModeChange: (value: QueryMode) => void;
  onTopKChange: (value: number) => void;
  inferenceServiceName?: string;
  inferenceModelOptions: { label: string; value: string }[];
  inferenceModelsLoading: boolean;
  defaultInferenceService?: string;
  onInferenceServiceChange: (value?: string) => void;
  onComplete: (sessionId?: string) => void;
}) {
  const sessionIdRef = useRef(sessionId);
  const adapter = useMemo(
    () =>
      createKnowledgeBaseAdapter(kbId, sessionIdRef, mode, topK, inferenceServiceName, onComplete),
    [inferenceServiceName, kbId, mode, onComplete, topK],
  );
  const runtime = useLocalRuntime(adapter, { initialMessages });

  return (
    <div className={styles.conversationPane}>
      <AssistantRuntimeProvider runtime={runtime}>
        <KnowledgeThread
          mode={mode}
          topK={topK}
          onModeChange={onModeChange}
          onTopKChange={onTopKChange}
          inferenceServiceName={inferenceServiceName}
          inferenceModelOptions={inferenceModelOptions}
          inferenceModelsLoading={inferenceModelsLoading}
          defaultInferenceService={defaultInferenceService}
          onInferenceServiceChange={onInferenceServiceChange}
        />
      </AssistantRuntimeProvider>
    </div>
  );
}

function KnowledgeThread({
  mode,
  topK,
  onModeChange,
  onTopKChange,
  inferenceServiceName,
  inferenceModelOptions,
  inferenceModelsLoading,
  defaultInferenceService,
  onInferenceServiceChange,
}: {
  mode: QueryMode;
  topK: number;
  onModeChange: (value: QueryMode) => void;
  onTopKChange: (value: number) => void;
  inferenceServiceName?: string;
  inferenceModelOptions: { label: string; value: string }[];
  inferenceModelsLoading: boolean;
  defaultInferenceService?: string;
  onInferenceServiceChange: (value?: string) => void;
}) {
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
                <div className={styles.composerSettings}>
                  <Select
                    aria-label="问答模式"
                    size="small"
                    trigger="hover"
                    style={{ width: 80 }}
                    value={mode}
                    options={[
                      { label: "同步", value: "sync" },
                      { label: "流式", value: "stream" },
                    ]}
                    onChange={(value) => onModeChange(value as QueryMode)}
                  />
                  <label className={styles.topKControl}>
                    <Typography.Text type="secondary">TopK</Typography.Text>
                    <InputNumber
                      size="small"
                      min={1}
                      max={20}
                      precision={0}
                      value={topK}
                      onChange={(value) => onTopKChange(Number(value) || 5)}
                    />
                  </label>
                  <Select
                    aria-label="推理模型"
                    className={styles.modelSelect}
                    size="small"
                    allowClear
                    showSearch
                    loading={inferenceModelsLoading}
                    disabled={inferenceModelsLoading || inferenceModelOptions.length === 0}
                    value={inferenceServiceName}
                    filterOption={(inputValue, option) => {
                      const normalizedInput = inputValue.trim().toLowerCase();
                      const optionValue = String(option.props.value).toLowerCase();
                      const optionLabel = String(option.props.extra ?? "").toLowerCase();

                      return (
                        optionValue.includes(normalizedInput) ||
                        optionLabel.includes(normalizedInput)
                      );
                    }}
                    renderFormat={(option, value) => (
                      <span title={String(option?.extra ?? value)}>{String(value)}</span>
                    )}
                    placeholder={
                      defaultInferenceService
                        ? `知识库默认：${defaultInferenceService}`
                        : "平台默认模型"
                    }
                    onChange={(value) => onInferenceServiceChange(value || undefined)}
                  >
                    {inferenceModelOptions.map((option) => (
                      <Select.Option
                        key={option.value}
                        value={option.value}
                        extra={option.label}
                        title={option.label}
                      >
                        {option.value}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
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
