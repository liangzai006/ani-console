export interface paths {
  "/knowledge-bases": {
    get: operations["listKnowledgeBases"];
    post: operations["createKnowledgeBase"];
  };
  "/knowledge-bases/{kb_id}": {
    get: operations["getKnowledgeBase"];
    delete: operations["deleteKnowledgeBase"];
  };
  "/knowledge-bases/{kb_id}/documents": {
    get: operations["listKnowledgeBaseDocuments"];
    post: operations["getDocumentUploadURL"];
  };
  "/knowledge-bases/{kb_id}/documents/{doc_id}/notify-uploaded": {
    post: operations["notifyDocumentUploaded"];
  };
  "/knowledge-bases/{kb_id}/documents/{doc_id}": {
    delete: operations["deleteKnowledgeBaseDocument"];
  };
  "/knowledge-bases/{kb_id}/documents/{doc_id}/chunks": {
    get: operations["listKnowledgeBaseDocumentChunks"];
  };
  "/knowledge-bases/{kb_id}/documents/{doc_id}/reparse": {
    post: operations["reparseKnowledgeBaseDocument"];
  };
  "/knowledge-bases/{kb_id}/query": {
    post: operations["queryKnowledgeBase"];
  };
  "/knowledge-bases/{kb_id}/query/stream": {
    get: operations["streamQueryKnowledgeBase"];
  };
  "/knowledge-bases/{kb_id}/citations": {
    get: operations["listKnowledgeBaseCitations"];
  };
  "/knowledge-bases/{kb_id}/sessions": {
    get: operations["listKnowledgeBaseSessions"];
  };
  "/knowledge-bases/{kb_id}/sessions/{session_id}": {
    delete: operations["deleteKnowledgeBaseSession"];
  };
  "/knowledge-bases/{kb_id}/sessions/{session_id}/messages": {
    get: operations["listKnowledgeBaseSessionMessages"];
  };
  "/knowledge-bases/{kb_id}/permissions": {
    get: operations["getKnowledgeBasePermissions"];
    put: operations["updateKnowledgeBasePermissions"];
  };
  "/models": {
    get: operations["listModels"];
  };
  "/models/import": {
    post: operations["importModel"];
  };
  "/models/{model_id}": {
    get: operations["getModel"];
    delete: operations["deleteModel"];
  };
  "/model-import-tasks/{task_id}": {
    get: operations["getModelImportTask"];
  };
  "/inference-services": {
    get: operations["listInferenceServices"];
    post: operations["createInferenceService"];
  };
  "/inference-services/{service_id}": {
    get: operations["getInferenceService"];
    patch: operations["updateInferenceService"];
    delete: operations["deleteInferenceService"];
  };
  "/inference-services/{service_id}/lifecycle": {
    post: operations["applyInferenceServiceLifecycle"];
  };
  "/inference-services/{service_id}/logs": {
    get: operations["listInferenceServiceLogs"];
  };
  "/inference-services/{service_id}/policies": {
    get: operations["listInferenceServicePolicies"];
  };
  "/inference-operations/{operation_id}": {
    get: operations["getInferenceOperation"];
  };
}

export interface components {
  schemas: {
    KnowledgeBase: {
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
    };
    KBDocument: {
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
    };
    KBQueryResponse: {
      answer: string;
      sources: Array<{
        doc_id?: string;
        file_name?: string;
        page?: number;
        content?: string;
        score?: number;
      }>;
      session_id?: string;
      input_tokens?: number;
      output_tokens?: number;
    };
    KBCitation: {
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
    };
    KBCitationListResponse: {
      items: components["schemas"]["KBCitation"][];
      next_cursor?: string | null;
    };
    KBSession: {
      id: string;
      kb_id: string;
      message_count?: number;
      last_query?: string | null;
      created_at: string;
      last_active_at?: string | null;
    };
    KBSessionListResponse: {
      items: components["schemas"]["KBSession"][];
      next_cursor?: string | null;
    };
    KBSourceChunk: {
      doc_id?: string;
      file_name?: string;
      page?: number | null;
      content?: string;
      score?: number | null;
    };
    KBSessionMessage: {
      id: string;
      session_id: string;
      role: "user" | "assistant";
      content: string;
      sources?: components["schemas"]["KBSourceChunk"][] | null;
      input_tokens?: number | null;
      output_tokens?: number | null;
      duration_ms?: number | null;
      created_at: string;
    };
    KBSessionMessageListResponse: {
      items: components["schemas"]["KBSessionMessage"][];
      next_cursor?: string | null;
    };
    KBChunk: {
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
    };
    KBChunkListResponse: {
      items: components["schemas"]["KBChunk"][];
      next_cursor?: string | null;
    };
    KBPermissions: {
      kb_id: string;
      public_read: boolean;
      allowed_user_ids: string[];
      updated_at?: string | null;
    };
    DocumentUploadURLResponse: {
      doc_id: string;
      upload_url: string;
      storage_path: string;
    };
    AsyncTask: {
      id: string;
      idempotency_key: string;
      task_type: string;
      resource_type?: string | null;
      resource_id?: string | null;
      status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
        | "dead_letter";
      attempt_count?: number;
      max_attempts?: number;
      progress_pct?: number;
      result?: Record<string, unknown> | null;
      error_message?: string | null;
      created_at: string;
      completed_at?: string | null;
    };
    ModelVersion: {
      id: string;
      model_id: string;
      version: string;
      format: "safetensors" | "gguf" | "pytorch" | string;
      is_encrypted?: boolean;
      size_bytes?: number;
      checksum_sha256?: string | null;
      storage_path?: string;
      created_at: string;
    };
    Model: {
      id: string;
      name: string;
      display_name?: string;
      description?: string | null;
      source: "upload" | "huggingface" | "modelscope" | "builtin";
      capabilities?: string[];
      status: "pending" | "downloading" | "ready" | "error" | "deleted";
      total_size_bytes?: number;
      created_at: string;
      updated_at?: string | null;
      versions?: components["schemas"]["ModelVersion"][];
    };
    ModelListResponse: {
      items: components["schemas"]["Model"][];
      total?: number;
      next_cursor?: string | null;
    };
    ImportModelRequest: {
      source: "huggingface" | "modelscope";
      repo_id: string;
      revision?: string;
      idempotency_key: string;
      webhook_url?: string;
    };
    InferenceServiceAccelerator: {
      spec_id: string;
      count_per_replica: number;
      memory?: number;
    };
    InferenceServiceResources: {
      cpu: string;
      memory: string;
      accelerator?: components["schemas"]["InferenceServiceAccelerator"];
    };
    InferenceServiceEngine: {
      env?: Array<{ name: string; value: string }>;
      command?: string[];
    };
    InferenceService: {
      id: string;
      name: string;
      model: string;
      model_version_id?: string | null;
      served_model_name: string;
      image_id?: string | null;
      image_ref?: string | null;
      replicas: number;
      ready_replicas: number;
      resources?: components["schemas"]["InferenceServiceResources"] | null;
      placement_mode: "auto" | "single_node" | "multi_node" | string;
      engine?: components["schemas"]["InferenceServiceEngine"] | null;
      gpu_type?: string | null;
      gpu_count_per_pod: number;
      max_concurrency: number;
      status:
        | "pending"
        | "deploying"
        | "running"
        | "stopping"
        | "stopped"
        | "failed"
        | string;
      status_reason?: string | null;
      status_message?: string | null;
      generation: number;
      observed_generation: number;
      current_operation_id?: string | null;
      invocation_url?: string | null;
      endpoint_url?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    InferenceServiceListResponse: {
      items: components["schemas"]["InferenceService"][];
    };
    CreateInferenceServiceRequest: {
      idempotency_key: string;
      name: string;
      model: string;
      model_version_id?: string;
      served_model_name?: string;
      replicas?: number;
      resources?: components["schemas"]["InferenceServiceResources"];
      placement_mode?: "auto" | "single_node" | "multi_node";
      image_id?: string;
      image_ref?: string;
      engine?: components["schemas"]["InferenceServiceEngine"];
    };
    UpdateInferenceServiceRequest: {
      idempotency_key: string;
      replicas: number;
    };
    InferenceServiceLifecycleRequest: {
      idempotency_key: string;
      action: "start" | "stop" | "restart";
    };
    InferenceOperation: {
      id: string;
      idempotency_key: string;
      task_type: string;
      resource_type: string;
      resource_id?: string | null;
      status: string;
      attempt_count: number;
      progress_pct: number;
      error_message?: string | null;
      created_at?: string | null;
      completed_at?: string | null;
    };
    InferenceServiceLog: {
      timestamp?: string | null;
      level: "debug" | "info" | "warn" | "error" | string;
      message: string;
      container?: string | null;
      stream?: string | null;
    };
    InferenceServiceLogListResponse: {
      items: components["schemas"]["InferenceServiceLog"][];
      next_cursor?: string | null;
    };
    InferenceAccessPolicyScope: {
      type:
        | "tenant_default"
        | "inference_service"
        | "api_key"
        | "inference_service_api_key";
      inference_service_ids?: string[];
      api_key_ids?: string[];
    };
    InferenceAccessPolicyAccess: {
      allow_all_tenant_keys: boolean;
      allow_api_key_ids?: string[];
      deny_api_key_ids?: string[];
    };
    InferenceAccessPolicyRateLimits: {
      qps?: number | null;
      rpm?: number | null;
    };
    InferenceAccessPolicyConcurrency: {
      max_in_flight?: number | null;
      lease_ttl_seconds?: number;
    };
    InferenceAccessPolicy: {
      id: string;
      tenant_id: string;
      name: string;
      status: "enabled" | "disabled";
      description?: string | null;
      priority: number;
      scope: components["schemas"]["InferenceAccessPolicyScope"];
      access: components["schemas"]["InferenceAccessPolicyAccess"];
      rate_limits: components["schemas"]["InferenceAccessPolicyRateLimits"];
      concurrency: components["schemas"]["InferenceAccessPolicyConcurrency"];
      created_at: string;
      updated_at?: string | null;
    };
    InferenceServicePolicies: {
      service_id: string;
      policies: components["schemas"]["InferenceAccessPolicy"][];
    };
  };
}

interface ErrorResponse {
  code: string;
  message: string;
  request_id: string;
  details?: Record<string, unknown>;
}
interface ErrorContent {
  headers: Record<string, unknown>;
  content: { "application/json": ErrorResponse };
}

export interface operations {
  listKnowledgeBases: {
    parameters: {
      query?: {
        limit?: number;
        cursor?: string;
        status?: string;
        name?: string;
        id?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: {
          "application/json": {
            items: components["schemas"]["KnowledgeBase"][];
            total: number;
            next_cursor?: string | null;
          };
        };
      };
    };
  };
  createKnowledgeBase: {
    parameters: { query?: never; header?: never; path?: never; cookie?: never };
    requestBody: {
      content: {
        "application/json": {
          idempotency_key: string;
          name: string;
          description?: string;
          embedding_model?: string;
          chunk_size?: number;
          top_k?: number;
          score_threshold?: number;
        };
      };
    };
    responses: {
      201: {
        headers: Record<string, unknown>;
        content: { "application/json": components["schemas"]["KnowledgeBase"] };
      };
    };
  };
  getKnowledgeBase: {
    parameters: {
      query?: never;
      header?: never;
      path: { kb_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: { "application/json": components["schemas"]["KnowledgeBase"] };
      };
      404: ErrorContent;
    };
  };
  deleteKnowledgeBase: {
    parameters: {
      query?: never;
      header?: never;
      path: { kb_id: string };
      cookie?: never;
    };
    responses: {
      204: { headers: Record<string, unknown>; content?: never };
      404: ErrorContent;
    };
  };
  listKnowledgeBaseDocuments: {
    parameters: {
      query?: { limit?: number; cursor?: string; parse_status?: string };
      header?: never;
      path: { kb_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: {
          "application/json": {
            items: components["schemas"]["KBDocument"][];
            total: number;
            next_cursor?: string | null;
          };
        };
      };
    };
  };
  getDocumentUploadURL: {
    parameters: {
      query?: never;
      header?: never;
      path: { kb_id: string };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          idempotency_key: string;
          file_name: string;
          file_type: "pdf" | "docx" | "xlsx" | "pptx" | "md" | "txt";
          file_size_bytes: number;
          checksum_sha256: string;
        };
      };
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["DocumentUploadURLResponse"];
        };
      };
      400: ErrorContent;
      413: ErrorContent;
      422: ErrorContent;
    };
  };
  notifyDocumentUploaded: {
    parameters: {
      query?: never;
      header?: never;
      path: { kb_id: string; doc_id: string };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          idempotency_key: string;
          doc_id: string;
          storage_path: string;
        };
      };
    };
    responses: {
      202: {
        headers: Record<string, unknown>;
        content: { "application/json": Record<string, unknown> };
      };
      404: ErrorContent;
      422: ErrorContent;
    };
  };
  deleteKnowledgeBaseDocument: {
    parameters: {
      query?: never;
      header?: never;
      path: { kb_id: string; doc_id: string };
      cookie?: never;
    };
    responses: {
      204: { headers: Record<string, unknown>; content?: never };
      404: ErrorContent;
    };
  };
  listKnowledgeBaseDocumentChunks: {
    parameters: {
      query?: {
        limit?: number;
        cursor?: string;
        chunk_type?: "child" | "parent" | "doc_summary";
      };
      header?: never;
      path: { kb_id: string; doc_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: { "application/json": components["schemas"]["KBChunkListResponse"] };
      };
      401: ErrorContent;
      403: ErrorContent;
      404: ErrorContent;
    };
  };
  reparseKnowledgeBaseDocument: {
    parameters: {
      query?: never;
      header?: never;
      path: { kb_id: string; doc_id: string };
      cookie?: never;
    };
    requestBody: {
      content: { "application/json": { idempotency_key: string } };
    };
    responses: {
      202: {
        headers: Record<string, unknown>;
        content: { "application/json": Record<string, unknown> };
      };
      400: ErrorContent;
      401: ErrorContent;
      403: ErrorContent;
      404: ErrorContent;
      409: ErrorContent;
    };
  };
  queryKnowledgeBase: {
    parameters: {
      query?: never;
      header?: never;
      path: { kb_id: string };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          question: string;
          idempotency_key: string;
          session_id?: string;
          top_k?: number;
          score_threshold?: number;
        };
      };
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["KBQueryResponse"];
        };
      };
      400: ErrorContent;
      404: ErrorContent;
    };
  };
  streamQueryKnowledgeBase: {
    parameters: {
      query: { question: string; session_id?: string; top_k?: number };
      header?: never;
      path: { kb_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: { "text/event-stream": string };
      };
      400: ErrorContent;
      401: ErrorContent;
      404: ErrorContent;
    };
  };
  listKnowledgeBaseCitations: {
    parameters: {
      query?: { limit?: number; cursor?: string };
      header?: never;
      path: { kb_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["KBCitationListResponse"];
        };
      };
      401: ErrorContent;
      403: ErrorContent;
      404: ErrorContent;
    };
  };
  listKnowledgeBaseSessions: {
    parameters: {
      query?: { limit?: number; cursor?: string };
      header?: never;
      path: { kb_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: { "application/json": components["schemas"]["KBSessionListResponse"] };
      };
      401: ErrorContent;
      403: ErrorContent;
      404: ErrorContent;
    };
  };
  deleteKnowledgeBaseSession: {
    parameters: {
      query?: never;
      header?: never;
      path: { kb_id: string; session_id: string };
      cookie?: never;
    };
    responses: {
      204: { headers: Record<string, unknown>; content?: never };
      401: ErrorContent;
      403: ErrorContent;
      404: ErrorContent;
    };
  };
  listKnowledgeBaseSessionMessages: {
    parameters: {
      query?: { limit?: number; cursor?: string };
      header?: never;
      path: { kb_id: string; session_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["KBSessionMessageListResponse"];
        };
      };
      401: ErrorContent;
      403: ErrorContent;
      404: ErrorContent;
    };
  };
  getKnowledgeBasePermissions: {
    parameters: {
      query?: never;
      header?: never;
      path: { kb_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: { "application/json": components["schemas"]["KBPermissions"] };
      };
      401: ErrorContent;
      403: ErrorContent;
      404: ErrorContent;
    };
  };
  updateKnowledgeBasePermissions: {
    parameters: {
      query?: never;
      header?: never;
      path: { kb_id: string };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          idempotency_key: string;
          public_read?: boolean;
          allowed_user_ids?: string[];
        };
      };
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: { "application/json": components["schemas"]["KnowledgeBase"] };
      };
      400: ErrorContent;
      401: ErrorContent;
      403: ErrorContent;
      404: ErrorContent;
    };
  };
  listModels: {
    parameters: {
      query?: {
        keyword?: string;
        source?: "upload" | "huggingface" | "modelscope" | "builtin";
        capability?: "text-generation" | "embedding" | "speech-to-text";
        status?: "pending" | "downloading" | "ready" | "error" | "deleted";
        limit?: number;
        cursor?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["ModelListResponse"];
        };
      };
      401: ErrorContent;
      403: ErrorContent;
    };
  };
  importModel: {
    parameters: { query?: never; header?: never; path?: never; cookie?: never };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ImportModelRequest"];
      };
    };
    responses: {
      202: {
        headers: Record<string, unknown>;
        content: { "application/json": components["schemas"]["AsyncTask"] };
      };
      400: ErrorContent;
      401: ErrorContent;
    };
  };
  getModel: {
    parameters: {
      query?: never;
      header?: never;
      path: { model_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: { "application/json": components["schemas"]["Model"] };
      };
      401: ErrorContent;
      403: ErrorContent;
      404: ErrorContent;
    };
  };
  deleteModel: {
    parameters: {
      query?: never;
      header?: never;
      path: { model_id: string };
      cookie?: never;
    };
    responses: {
      204: { headers: Record<string, unknown>; content?: never };
      401: ErrorContent;
      403: ErrorContent;
      404: ErrorContent;
      409: ErrorContent;
    };
  };
  getModelImportTask: {
    parameters: {
      query?: never;
      header?: never;
      path: { task_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: { "application/json": components["schemas"]["AsyncTask"] };
      };
      401: ErrorContent;
      403: ErrorContent;
      404: ErrorContent;
    };
  };
  listInferenceServices: {
    parameters: { query?: never; header?: never; path?: never; cookie?: never };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["InferenceServiceListResponse"];
        };
      };
    };
  };
  createInferenceService: {
    parameters: { query?: never; header?: never; path?: never; cookie?: never };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateInferenceServiceRequest"];
      };
    };
    responses: {
      202: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["InferenceService"];
        };
      };
      400: ErrorContent;
      409: ErrorContent;
      422: ErrorContent;
    };
  };
  getInferenceService: {
    parameters: {
      query?: never;
      header?: never;
      path: { service_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["InferenceService"];
        };
      };
      404: ErrorContent;
    };
  };
  updateInferenceService: {
    parameters: {
      query?: never;
      header?: never;
      path: { service_id: string };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateInferenceServiceRequest"];
      };
    };
    responses: {
      202: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["InferenceOperation"];
        };
      };
      400: ErrorContent;
      404: ErrorContent;
      409: ErrorContent;
      422: ErrorContent;
    };
  };
  deleteInferenceService: {
    parameters: {
      query?: never;
      header?: never;
      path: { service_id: string };
      cookie?: never;
    };
    responses: {
      202: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["InferenceOperation"];
        };
      };
      404: ErrorContent;
      409: ErrorContent;
    };
  };
  applyInferenceServiceLifecycle: {
    parameters: {
      query?: never;
      header?: never;
      path: { service_id: string };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["InferenceServiceLifecycleRequest"];
      };
    };
    responses: {
      202: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["InferenceOperation"];
        };
      };
      400: ErrorContent;
      404: ErrorContent;
      409: ErrorContent;
      422: ErrorContent;
    };
  };
  listInferenceServiceLogs: {
    parameters: {
      query?: {
        limit?: number;
        cursor?: string;
        level?: "debug" | "info" | "warn" | "error";
      };
      header?: never;
      path: { service_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["InferenceServiceLogListResponse"];
        };
      };
      400: ErrorContent;
      404: ErrorContent;
    };
  };
  listInferenceServicePolicies: {
    parameters: {
      query?: never;
      header?: never;
      path: { service_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["InferenceServicePolicies"];
        };
      };
      401: ErrorContent;
      404: ErrorContent;
    };
  };
  getInferenceOperation: {
    parameters: {
      query?: never;
      header?: never;
      path: { operation_id: string };
      cookie?: never;
    };
    responses: {
      200: {
        headers: Record<string, unknown>;
        content: {
          "application/json": components["schemas"]["InferenceOperation"];
        };
      };
      404: ErrorContent;
    };
  };
}
