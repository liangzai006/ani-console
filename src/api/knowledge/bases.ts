import { runIdempotentRequest } from "@/api/idempotency";
import { servicesRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateKnowledgeBaseInput,
  CreateKnowledgeBaseRequest,
  KBAuditLogListParams,
  KBAuditLogListResponse,
  KnowledgeBase,
  KnowledgeBaseListParams,
  KnowledgeBaseListResponse,
} from "./types";

const createScope = createIdempotencyScope("knowledge-base-create", ["POST"]);
const knowledgeBasePath = (kbId: string) => `/knowledge-bases/${encodeURIComponent(kbId)}`;

export function listKnowledgeBases(
  params: KnowledgeBaseListParams = {},
): Promise<KnowledgeBaseListResponse> {
  return servicesRequest<KnowledgeBaseListResponse>("/knowledge-bases", {
    method: "GET",
    params,
  });
}

export function createKnowledgeBase(submitData: CreateKnowledgeBaseInput): Promise<KnowledgeBase> {
  return runIdempotentRequest(createScope, submitData, (body) =>
    servicesRequest<KnowledgeBase, CreateKnowledgeBaseRequest>("/knowledge-bases", {
      method: "POST",
      data: body,
    }),
  );
}

export function getKnowledgeBase(kbId: string): Promise<KnowledgeBase> {
  return servicesRequest<KnowledgeBase>(knowledgeBasePath(kbId), { method: "GET" });
}

export function listKnowledgeBaseAuditLogs(
  kbId: string,
  params: KBAuditLogListParams = {},
): Promise<KBAuditLogListResponse> {
  return servicesRequest<KBAuditLogListResponse>(`${knowledgeBasePath(kbId)}/audit-logs`, {
    method: "GET",
    params,
  });
}

export function deleteKnowledgeBase(kbId: string): Promise<void> {
  return servicesRequest<void>(knowledgeBasePath(kbId), { method: "DELETE" });
}
