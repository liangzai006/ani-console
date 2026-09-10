export interface KnowledgeBase {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string;
  embedding_model?: string;
  chunk_size?: number;
  top_k?: number;
  score_threshold?: number;
  status: "active" | "rebuilding" | "deleted";
  doc_count?: number;
  created_at: string;
  updated_at?: string | null;
}

export interface KnowledgeBaseListParams {
  limit?: number;
  cursor?: string;
  status?: string;
  name?: string;
  id?: string;
}

export interface KnowledgeBaseListResponse {
  items: KnowledgeBase[];
  total: number;
  next_cursor?: string | null;
}

export interface CreateKnowledgeBaseInput {
  name: string;
  description?: string;
  embedding_model?: string;
  chunk_size?: number;
  top_k?: number;
  score_threshold?: number;
}

export interface CreateKnowledgeBaseRequest extends CreateKnowledgeBaseInput {
  idempotency_key: string;
}

export interface KBDocument {
  id: string;
  tenant_id?: string;
  kb_id: string;
  file_name: string;
  file_type?: string | null;
  file_size_bytes?: number;
  parse_status: "pending" | "parsing" | "indexing" | "ready" | "failed";
  chunk_count?: number;
  error_message?: string | null;
  custom_metadata?: string | Record<string, unknown> | null;
  created_at: string;
  parsed_at?: string | null;
}

export interface KBDocumentListParams {
  limit?: number;
  cursor?: string;
  parse_status?: string;
}

export interface KBDocumentListResponse {
  items: KBDocument[];
  total: number;
  next_cursor?: string | null;
}

export type KnowledgeDocumentFileType = "pdf" | "docx" | "xlsx" | "pptx" | "md" | "txt";

export interface ReserveDocumentUploadInput {
  file_name: string;
  file_type: KnowledgeDocumentFileType;
  file_size_bytes: number;
  checksum_sha256: string;
}

export interface ReserveDocumentUploadRequest extends ReserveDocumentUploadInput {
  idempotency_key: string;
}

export interface DocumentUploadReservation {
  doc_id: string;
  upload_url: string;
  storage_path: string;
}

export interface NotifyDocumentUploadedInput {
  doc_id: string;
  storage_path: string;
}

export interface NotifyDocumentUploadedRequest extends NotifyDocumentUploadedInput {
  idempotency_key: string;
}

export interface AsyncTaskRef {
  task_id: string;
  task_type: string;
  status: string;
}

export interface KBChunk {
  id: string;
  doc_id: string;
  kb_id: string;
  parent_chunk_id?: string | null;
  chunk_type: "child" | "parent" | "doc_summary";
  content: string;
  parent_content?: string | null;
  page_number?: number | null;
  content_type?: string;
  file_name: string;
  token_count?: number;
  custom_metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface KBChunkListParams {
  limit?: number;
  cursor?: string;
  chunk_type?: "child" | "parent" | "doc_summary";
}

export interface KBChunkListResponse {
  items: KBChunk[];
  next_cursor?: string | null;
}

export interface KBSourceChunk {
  doc_id?: string;
  file_name?: string;
  page?: number | null;
  content?: string;
  score?: number | null;
}

export interface KBQueryInput {
  question: string;
  session_id?: string;
  top_k?: number;
  score_threshold?: number;
}

export interface KBQueryRequest extends KBQueryInput {
  idempotency_key: string;
}

export interface KBQueryResponse {
  answer: string;
  sources: KBSourceChunk[];
  session_id?: string;
  input_tokens?: number;
  output_tokens?: number;
}

export interface KBStreamQueryParams {
  question: string;
  session_id?: string;
  top_k?: number;
}

export interface KBCitation {
  id: string;
  kb_id: string;
  doc_id: string;
  file_name: string;
  page?: number | null;
  content: string;
  score?: number | null;
  created_at: string;
  message_id?: string | null;
  session_id?: string | null;
}

export interface KBCitationListResponse {
  items: KBCitation[];
  next_cursor?: string | null;
}

export interface KBSession {
  id: string;
  kb_id: string;
  message_count?: number;
  last_query?: string | null;
  created_at: string;
  last_active_at?: string | null;
}

export interface KBSessionListResponse {
  items: KBSession[];
  next_cursor?: string | null;
}

export interface KBSessionMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources?: KBSourceChunk[] | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  duration_ms?: number | null;
  created_at: string;
}

export interface KBSessionMessageListResponse {
  items: KBSessionMessage[];
  next_cursor?: string | null;
}

export interface KBPermissions {
  kb_id: string;
  public_read: boolean;
  allowed_user_ids: string[];
  updated_at?: string | null;
}

export interface UpdateKBPermissionsInput {
  public_read?: boolean;
  allowed_user_ids?: string[];
}

export interface UpdateKBPermissionsRequest extends UpdateKBPermissionsInput {
  idempotency_key: string;
}
