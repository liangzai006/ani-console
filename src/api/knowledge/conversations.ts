import { runIdempotentRequest } from "@/api/idempotency";
import { servicesRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  KBCitationListResponse,
  KnowledgeBase,
  KBPermissions,
  KBQueryInput,
  KBQueryRequest,
  KBQueryResponse,
  KBSessionListResponse,
  KBSessionMessageListResponse,
  KBStreamQueryParams,
  UpdateKBPermissionsInput,
  UpdateKBPermissionsRequest,
} from "./types";

const queryScope = createIdempotencyScope("knowledge-base-query", ["POST"]);
const permissionsScope = createIdempotencyScope("knowledge-base-permissions-update", ["PUT"]);
const knowledgeBasePath = (kbId: string) => `/knowledge-bases/${encodeURIComponent(kbId)}`;
const sessionPath = (kbId: string, sessionId: string) =>
  `${knowledgeBasePath(kbId)}/sessions/${encodeURIComponent(sessionId)}`;

export function queryKnowledgeBase(
  kbId: string,
  submitData: KBQueryInput,
): Promise<KBQueryResponse> {
  return runIdempotentRequest(
    queryScope,
    submitData,
    (body) =>
      servicesRequest<KBQueryResponse, KBQueryRequest>(`${knowledgeBasePath(kbId)}/query`, {
        method: "POST",
        data: body,
      }),
    [kbId],
  );
}

export function streamKnowledgeBaseQuery(
  kbId: string,
  params: KBStreamQueryParams,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  return servicesRequest<ReadableStream<Uint8Array>>(`${knowledgeBasePath(kbId)}/query/stream`, {
    method: "GET",
    adapter: "fetch",
    responseType: "stream",
    headers: { Accept: "text/event-stream" },
    params,
    signal,
  });
}

export function listKnowledgeBaseCitations(
  kbId: string,
  params: { limit?: number; cursor?: string } = {},
): Promise<KBCitationListResponse> {
  return servicesRequest<KBCitationListResponse>(`${knowledgeBasePath(kbId)}/citations`, {
    method: "GET",
    params,
  });
}

export function listKnowledgeBaseSessions(
  kbId: string,
  params: { limit?: number; cursor?: string } = {},
): Promise<KBSessionListResponse> {
  return servicesRequest<KBSessionListResponse>(`${knowledgeBasePath(kbId)}/sessions`, {
    method: "GET",
    params,
  });
}

export function listKnowledgeBaseSessionMessages(
  kbId: string,
  sessionId: string,
  params: { limit?: number; cursor?: string } = {},
): Promise<KBSessionMessageListResponse> {
  return servicesRequest<KBSessionMessageListResponse>(`${sessionPath(kbId, sessionId)}/messages`, {
    method: "GET",
    params,
  });
}

export function deleteKnowledgeBaseSession(kbId: string, sessionId: string): Promise<void> {
  return servicesRequest<void>(sessionPath(kbId, sessionId), { method: "DELETE" });
}

export function getKnowledgeBasePermissions(kbId: string): Promise<KBPermissions> {
  return servicesRequest<KBPermissions>(`${knowledgeBasePath(kbId)}/permissions`, {
    method: "GET",
  });
}

export function updateKnowledgeBasePermissions(
  kbId: string,
  submitData: UpdateKBPermissionsInput,
): Promise<KnowledgeBase> {
  return runIdempotentRequest(
    permissionsScope,
    submitData,
    (body) =>
      servicesRequest<KnowledgeBase, UpdateKBPermissionsRequest>(
        `${knowledgeBasePath(kbId)}/permissions`,
        { method: "PUT", data: body },
      ),
    [kbId],
  );
}
