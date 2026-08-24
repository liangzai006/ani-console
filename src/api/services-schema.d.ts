export interface paths {
  '/knowledge-bases': {
    get: operations['listKnowledgeBases']
    post: operations['createKnowledgeBase']
  }
  '/knowledge-bases/{kb_id}': {
    get: operations['getKnowledgeBase']
    delete: operations['deleteKnowledgeBase']
  }
  '/knowledge-bases/{kb_id}/documents': {
    get: operations['listKnowledgeBaseDocuments']
    post: operations['getDocumentUploadURL']
  }
  '/knowledge-bases/{kb_id}/documents/{doc_id}/notify-uploaded': {
    post: operations['notifyDocumentUploaded']
  }
  '/knowledge-bases/{kb_id}/documents/{doc_id}': {
    delete: operations['deleteKnowledgeBaseDocument']
  }
  '/knowledge-bases/{kb_id}/query': {
    post: operations['queryKnowledgeBase']
  }
  '/inference-services': {
    get: operations['listInferenceServices']
    post: operations['createInferenceService']
  }
  '/inference-services/{service_id}': {
    get: operations['getInferenceService']
    patch: operations['updateInferenceService']
    delete: operations['deleteInferenceService']
  }
  '/inference-services/{service_id}/lifecycle': {
    post: operations['applyInferenceServiceLifecycle']
  }
  '/inference-services/{service_id}/logs': {
    get: operations['listInferenceServiceLogs']
  }
  '/inference-operations/{operation_id}': {
    get: operations['getInferenceOperation']
  }
}

export interface components {
  schemas: {
    KnowledgeBase: {
      id: string
      tenant_id?: string
      name: string
      description?: string
      embedding_model?: string
      chunk_size?: number
      top_k?: number
      score_threshold?: number
      status: 'active' | 'rebuilding' | 'deleted'
      doc_count?: number
      created_at: string
      updated_at?: string | null
    }
    KBDocument: {
      id: string
      tenant_id?: string
      kb_id: string
      file_name: string
      file_type?: string | null
      file_size_bytes?: number
      parse_status: 'pending' | 'parsing' | 'indexing' | 'ready' | 'failed'
      chunk_count?: number
      error_message?: string | null
      created_at: string
      parsed_at?: string | null
    }
    KBQueryResponse: {
      answer: string
      sources: Array<{ doc_id?: string; file_name?: string; page?: number; content?: string; score?: number }>
      session_id?: string
      input_tokens?: number
      output_tokens?: number
    }
    DocumentUploadURLResponse: { doc_id: string; upload_url: string; storage_path: string }
    InferenceServiceAccelerator: {
      spec_id: string
      count_per_replica: number
      memory?: number
    }
    InferenceServiceResources: {
      cpu: string
      memory: string
      accelerator?: components['schemas']['InferenceServiceAccelerator']
    }
    InferenceServiceEngine: {
      env?: Array<{ name: string; value: string }>
      command?: string[]
    }
    InferenceService: {
      id: string
      name: string
      model: string
      model_version_id?: string | null
      served_model_name: string
      image_id?: string | null
      image_ref?: string | null
      replicas: number
      ready_replicas: number
      resources?: components['schemas']['InferenceServiceResources'] | null
      placement_mode: 'auto' | 'single_node' | 'multi_node' | string
      engine?: components['schemas']['InferenceServiceEngine'] | null
      gpu_type?: string | null
      gpu_count_per_pod: number
      max_concurrency: number
      status: 'pending' | 'deploying' | 'running' | 'stopping' | 'stopped' | 'failed' | string
      status_reason?: string | null
      status_message?: string | null
      generation: number
      observed_generation: number
      current_operation_id?: string | null
      invocation_url?: string | null
      endpoint_url?: string | null
      created_at?: string | null
      updated_at?: string | null
    }
    InferenceServiceListResponse: {
      items: components['schemas']['InferenceService'][]
    }
    CreateInferenceServiceRequest: {
      idempotency_key: string
      name: string
      model: string
      model_version_id?: string
      served_model_name?: string
      replicas?: number
      resources?: components['schemas']['InferenceServiceResources']
      placement_mode?: 'auto' | 'single_node' | 'multi_node'
      image_id?: string
      image_ref?: string
      engine?: components['schemas']['InferenceServiceEngine']
    }
    UpdateInferenceServiceRequest: {
      idempotency_key: string
      replicas: number
    }
    InferenceServiceLifecycleRequest: {
      idempotency_key: string
      action: 'start' | 'stop' | 'restart'
    }
    InferenceOperation: {
      id: string
      idempotency_key: string
      task_type: string
      resource_type: string
      resource_id?: string | null
      status: string
      attempt_count: number
      progress_pct: number
      error_message?: string | null
      created_at?: string | null
      completed_at?: string | null
    }
    InferenceServiceLog: {
      timestamp?: string | null
      level: 'debug' | 'info' | 'warn' | 'error' | string
      message: string
      container?: string | null
      stream?: string | null
    }
    InferenceServiceLogListResponse: {
      items: components['schemas']['InferenceServiceLog'][]
      next_cursor?: string | null
    }
  }
}

interface ErrorResponse { code: string; message: string; request_id: string; details?: Record<string, unknown> }
interface ErrorContent { headers: Record<string, unknown>; content: { 'application/json': ErrorResponse } }

export interface operations {
  listKnowledgeBases: {
    parameters: { query?: never; header?: never; path?: never; cookie?: never }
    responses: { 200: { headers: Record<string, unknown>; content: { 'application/json': { items?: components['schemas']['KnowledgeBase'][] } } } }
  }
  createKnowledgeBase: {
    parameters: { query?: never; header?: never; path?: never; cookie?: never }
    requestBody: { content: { 'application/json': { idempotency_key: string; name: string; description?: string; embedding_model?: string; chunk_size?: number; top_k?: number; score_threshold?: number } } }
    responses: { 201: { headers: Record<string, unknown>; content: { 'application/json': components['schemas']['KnowledgeBase'] } } }
  }
  getKnowledgeBase: {
    parameters: { query?: never; header?: never; path: { kb_id: string }; cookie?: never }
    responses: { 200: { headers: Record<string, unknown>; content: { 'application/json': components['schemas']['KnowledgeBase'] } }; 404: ErrorContent }
  }
  deleteKnowledgeBase: {
    parameters: { query?: never; header?: never; path: { kb_id: string }; cookie?: never }
    responses: { 204: { headers: Record<string, unknown>; content?: never }; 404: ErrorContent }
  }
  listKnowledgeBaseDocuments: {
    parameters: { query?: never; header?: never; path: { kb_id: string }; cookie?: never }
    responses: { 200: { headers: Record<string, unknown>; content: { 'application/json': { items?: components['schemas']['KBDocument'][] } } } }
  }
  getDocumentUploadURL: {
    parameters: { query?: never; header?: never; path: { kb_id: string }; cookie?: never }
    requestBody: { content: { 'application/json': { idempotency_key: string; file_name: string; file_type: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'md' | 'txt'; file_size_bytes: number; checksum_sha256: string } } }
    responses: { 200: { headers: Record<string, unknown>; content: { 'application/json': components['schemas']['DocumentUploadURLResponse'] } }; 400: ErrorContent; 413: ErrorContent; 422: ErrorContent }
  }
  notifyDocumentUploaded: {
    parameters: { query?: never; header?: never; path: { kb_id: string; doc_id: string }; cookie?: never }
    requestBody: { content: { 'application/json': { idempotency_key: string; doc_id: string; storage_path: string } } }
    responses: { 202: { headers: Record<string, unknown>; content: { 'application/json': Record<string, unknown> } }; 404: ErrorContent; 422: ErrorContent }
  }
  deleteKnowledgeBaseDocument: {
    parameters: { query?: never; header?: never; path: { kb_id: string; doc_id: string }; cookie?: never }
    responses: { 204: { headers: Record<string, unknown>; content?: never }; 404: ErrorContent }
  }
  queryKnowledgeBase: {
    parameters: { query?: never; header?: never; path: { kb_id: string }; cookie?: never }
    requestBody: { content: { 'application/json': { question: string; idempotency_key: string; session_id?: string; top_k?: number; score_threshold?: number } } }
    responses: { 200: { headers: Record<string, unknown>; content: { 'application/json': components['schemas']['KBQueryResponse'] } }; 400: ErrorContent; 404: ErrorContent }
  }
  listInferenceServices: {
    parameters: { query?: never; header?: never; path?: never; cookie?: never }
    responses: { 200: { headers: Record<string, unknown>; content: { 'application/json': components['schemas']['InferenceServiceListResponse'] } } }
  }
  createInferenceService: {
    parameters: { query?: never; header?: never; path?: never; cookie?: never }
    requestBody: { content: { 'application/json': components['schemas']['CreateInferenceServiceRequest'] } }
    responses: { 202: { headers: Record<string, unknown>; content: { 'application/json': components['schemas']['InferenceService'] } }; 400: ErrorContent; 409: ErrorContent; 422: ErrorContent }
  }
  getInferenceService: {
    parameters: { query?: never; header?: never; path: { service_id: string }; cookie?: never }
    responses: { 200: { headers: Record<string, unknown>; content: { 'application/json': components['schemas']['InferenceService'] } }; 404: ErrorContent }
  }
  updateInferenceService: {
    parameters: { query?: never; header?: never; path: { service_id: string }; cookie?: never }
    requestBody: { content: { 'application/json': components['schemas']['UpdateInferenceServiceRequest'] } }
    responses: { 202: { headers: Record<string, unknown>; content: { 'application/json': components['schemas']['InferenceOperation'] } }; 400: ErrorContent; 404: ErrorContent; 409: ErrorContent; 422: ErrorContent }
  }
  deleteInferenceService: {
    parameters: { query?: never; header?: never; path: { service_id: string }; cookie?: never }
    responses: { 202: { headers: Record<string, unknown>; content: { 'application/json': components['schemas']['InferenceOperation'] } }; 404: ErrorContent; 409: ErrorContent }
  }
  applyInferenceServiceLifecycle: {
    parameters: { query?: never; header?: never; path: { service_id: string }; cookie?: never }
    requestBody: { content: { 'application/json': components['schemas']['InferenceServiceLifecycleRequest'] } }
    responses: { 202: { headers: Record<string, unknown>; content: { 'application/json': components['schemas']['InferenceOperation'] } }; 400: ErrorContent; 404: ErrorContent; 409: ErrorContent; 422: ErrorContent }
  }
  listInferenceServiceLogs: {
    parameters: { query?: { limit?: number; cursor?: string; level?: 'debug' | 'info' | 'warn' | 'error' }; header?: never; path: { service_id: string }; cookie?: never }
    responses: { 200: { headers: Record<string, unknown>; content: { 'application/json': components['schemas']['InferenceServiceLogListResponse'] } }; 400: ErrorContent; 404: ErrorContent }
  }
  getInferenceOperation: {
    parameters: { query?: never; header?: never; path: { operation_id: string }; cookie?: never }
    responses: { 200: { headers: Record<string, unknown>; content: { 'application/json': components['schemas']['InferenceOperation'] } }; 404: ErrorContent }
  }
}
