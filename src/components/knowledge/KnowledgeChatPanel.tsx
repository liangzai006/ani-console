import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Message,
  Radio,
  Space,
  Spin,
  Typography,
} from "@arco-design/web-react";
import { useState } from "react";
import { servicesApi, SERVICES_API_BASE } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { showApiError } from "@/api/helpers";
import { newIdempotencyKey } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/auth";

type Answer = components["schemas"]["KBQueryResponse"];

export function KnowledgeChatPanel({ kbId }: { kbId: string }) {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"stream" | "sync">("stream");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [streamText, setStreamText] = useState("");
  const [sessionId, setSessionId] = useState<string>();
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    const value = question.trim();
    if (!value) return Message.warning("请输入问题");
    setLoading(true);
    setAnswer(null);
    setStreamText("");
    try {
      if (mode === "sync") {
        const { data, error } = await servicesApi.POST(
          "/knowledge-bases/{kb_id}/query",
          {
            params: { path: { kb_id: kbId } },
            body: {
              question: value,
              idempotency_key: newIdempotencyKey(),
              session_id: sessionId,
            },
          },
        );
        if (error || !data) throw error ?? new Error("问答未返回结果");
        setAnswer(data);
        setSessionId(data.session_id);
      } else {
        const params = new URLSearchParams({ question: value });
        if (sessionId) params.set("session_id", sessionId);
        const token = useAuthStore.getState().getAccessToken();
        const response = await fetch(
          `${SERVICES_API_BASE}/knowledge-bases/${encodeURIComponent(kbId)}/query/stream?${params}`,
          {
            credentials: "include",
            headers: {
              Accept: "text/event-stream",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );
        if (!response.ok || !response.body)
          throw new Error(`流式问答失败（HTTP ${response.status}）`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value: chunk, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(chunk, { stream: true });
          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() ?? "";
          for (const block of blocks) {
            const data = block
              .split(/\r?\n/)
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trimStart())
              .join("\n");
            if (!data || data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data) as {
                delta?: string;
                content?: string;
                answer?: string;
                session_id?: string;
              };
              setStreamText(
                (current) =>
                  current +
                  (parsed.delta ?? parsed.content ?? parsed.answer ?? ""),
              );
              if (parsed.session_id) setSessionId(parsed.session_id);
            } catch {
              setStreamText((current) => current + data);
            }
          }
        }
      }
      setQuestion("");
    } catch (error) {
      showApiError(error, "知识库问答失败");
    } finally {
      setLoading(false);
    }
  };
  const text = answer?.answer ?? streamText;
  return (
    <Space direction="vertical" size={16} className="w-full">
      <div className="flex items-center justify-between">
        <Typography.Title heading={6}>知识问答</Typography.Title>
        <Radio.Group type="button" value={mode} onChange={setMode}>
          <Radio value="stream">流式</Radio>
          <Radio value="sync">同步</Radio>
        </Radio.Group>
      </div>
      <Alert
        type="info"
        showIcon
        content="回答由当前知识库中的可检索文档生成，请核对重要信息。"
      />
      <Card bordered>
        <div className="min-h-48 whitespace-pre-wrap">
          {loading && !text ? (
            <div className="flex justify-center py-12">
              <Spin />
            </div>
          ) : (
            text || <Empty description="输入问题开始问答" />
          )}
        </div>
      </Card>
      {answer?.sources?.length ? (
        <Card title="回答来源">
          {answer.sources.map((source, index) => (
            <div key={`${source.doc_id}-${index}`} className="mb-3 last:mb-0">
              <Typography.Text bold>
                {source.file_name || source.doc_id || `来源 ${index + 1}`}
                {source.page ? ` · 第 ${source.page} 页` : ""}
              </Typography.Text>
              <Typography.Paragraph type="secondary" className="mb-0">
                {source.content || "—"}
              </Typography.Paragraph>
            </div>
          ))}
        </Card>
      ) : null}
      <Input.TextArea
        value={question}
        onChange={setQuestion}
        maxLength={2000}
        showWordLimit
        autoSize={{ minRows: 3, maxRows: 8 }}
        placeholder="请输入与知识库内容相关的问题"
        disabled={loading}
      />
      <div className="flex justify-end">
        <Button type="primary" loading={loading} onClick={() => void ask()}>
          发送问题
        </Button>
      </div>
    </Space>
  );
}
