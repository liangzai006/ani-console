import type { ChatModelAdapter, ThreadMessage, ThreadMessageLike } from "@assistant-ui/react";
import { SERVICES_API_BASE, servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import type { IdempotencyScope } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/auth";

type Answer = components["schemas"]["KBQueryResponse"];
type SessionMessage = components["schemas"]["KBSessionMessage"];
type Source = components["schemas"]["KBSourceChunk"];

export type QueryMode = "sync" | "stream";

function getLatestQuestion(messages: readonly ThreadMessage[]) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  return (
    latestUserMessage?.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim() ?? ""
  );
}

function formatSources(sources?: readonly Source[] | null) {
  if (!sources?.length) return "";
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

export function toThreadMessage(message: SessionMessage): ThreadMessageLike {
  return {
    id: message.id,
    role: message.role,
    content:
      message.role === "assistant"
        ? `${message.content}${formatSources(message.sources)}`
        : message.content,
    createdAt: new Date(message.created_at),
  };
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

export function createKnowledgeBaseAdapter(
  kbId: string,
  sessionIdRef: { current?: string },
  mode: QueryMode,
  topK: number,
  queryScope: IdempotencyScope,
  onComplete: (sessionId?: string) => void,
): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const question = getLatestQuestion(messages);
      if (!question) throw new Error("请输入问题");
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
        let completedSessionId = sessionIdRef.current;
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
                  completedSessionId = payload.session_id;
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
        onComplete(completedSessionId);
        return;
      }

      const submitData = {
        question,
        session_id: sessionIdRef.current,
        top_k: topK,
      };
      const { data, error } = await servicesApi.POST("/knowledge-bases/{kb_id}/query", {
        params: { path: { kb_id: kbId } },
        body: queryScope.withKey(submitData),
      });
      if (error || !data) throw error ?? new Error("问答未返回结果");
      queryScope.reset();
      sessionIdRef.current = data.session_id;
      onComplete(data.session_id);
      yield { content: [{ type: "text", text: formatAnswer(data) }] };
    },
  };
}
