import { runIdempotentRequest } from "@/api/idempotency";
import { externalAxios, servicesRequest, toApiError } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  AsyncTaskRef,
  DocumentUploadReservation,
  KBChunkListParams,
  KBChunkListResponse,
  KBDocumentListParams,
  KBDocumentListResponse,
  NotifyDocumentUploadedInput,
  NotifyDocumentUploadedRequest,
  ReserveDocumentUploadInput,
  ReserveDocumentUploadRequest,
} from "./types";

const reserveScope = createIdempotencyScope("knowledge-document-reserve", ["POST"]);
const notifyScope = createIdempotencyScope("knowledge-document-notify-uploaded", ["POST"]);
const reparseScope = createIdempotencyScope("knowledge-document-reparse", ["POST"]);
const knowledgeBasePath = (kbId: string) => `/knowledge-bases/${encodeURIComponent(kbId)}`;
const documentPath = (kbId: string, docId: string) =>
  `${knowledgeBasePath(kbId)}/documents/${encodeURIComponent(docId)}`;

export function listKnowledgeBaseDocuments(
  kbId: string,
  params: KBDocumentListParams = {},
): Promise<KBDocumentListResponse> {
  return servicesRequest<KBDocumentListResponse>(`${knowledgeBasePath(kbId)}/documents`, {
    method: "GET",
    params,
  });
}

export function deleteKnowledgeBaseDocument(kbId: string, docId: string): Promise<void> {
  return servicesRequest<void>(documentPath(kbId, docId), { method: "DELETE" });
}

export function listKnowledgeBaseDocumentChunks(
  kbId: string,
  docId: string,
  params: KBChunkListParams = {},
): Promise<KBChunkListResponse> {
  return servicesRequest<KBChunkListResponse>(`${documentPath(kbId, docId)}/chunks`, {
    method: "GET",
    params,
  });
}

export function reserveKnowledgeDocumentUpload(
  kbId: string,
  submitData: ReserveDocumentUploadInput,
): Promise<DocumentUploadReservation> {
  return runIdempotentRequest(
    reserveScope,
    submitData,
    (body) =>
      servicesRequest<DocumentUploadReservation, ReserveDocumentUploadRequest>(
        `${knowledgeBasePath(kbId)}/documents`,
        { method: "POST", data: body },
      ),
    [kbId],
  );
}

export async function uploadKnowledgeDocumentFile(
  uploadUrl: string,
  file: File,
  signal?: AbortSignal,
): Promise<void> {
  try {
    await externalAxios.put(uploadUrl, file, {
      signal,
      headers: file.type ? { "Content-Type": file.type } : undefined,
    });
  } catch (error) {
    throw toApiError(error);
  }
}

export function notifyKnowledgeDocumentUploaded(
  kbId: string,
  docId: string,
  submitData: NotifyDocumentUploadedInput,
): Promise<AsyncTaskRef> {
  return runIdempotentRequest(
    notifyScope,
    submitData,
    (body) =>
      servicesRequest<AsyncTaskRef, NotifyDocumentUploadedRequest>(
        `${documentPath(kbId, docId)}/notify-uploaded`,
        { method: "POST", data: body },
      ),
    [kbId, docId],
  );
}

export function reparseKnowledgeBaseDocument(kbId: string, docId: string): Promise<AsyncTaskRef> {
  return runIdempotentRequest(
    reparseScope,
    {},
    (body) =>
      servicesRequest<AsyncTaskRef, { idempotency_key: string }>(
        `${documentPath(kbId, docId)}/reparse`,
        { method: "POST", data: body },
      ),
    [kbId, docId],
  );
}
