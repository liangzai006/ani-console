export type ModelCatalogItem = {
  id: string;
  name: string;
  status: "available" | "importing" | "failed";
  source: "HuggingFace" | "ModelScope" | "本地上传";
  task: "文本生成" | "文本向量化" | "重排序";
  scale: string;
  latestVersion: string;
  size: string;
  updatedAt: string;
};

export const modelCatalogItems: ModelCatalogItem[] = [
  {
    id: "mdl_qwen25_72b",
    name: "Qwen2.5-72B-Instruct",
    status: "available",
    source: "ModelScope",
    task: "文本生成",
    scale: "72B",
    latestVersion: "v2.1",
    size: "145 GiB",
    updatedAt: "2026-08-22 16:40",
  },
  {
    id: "mdl_bge_m3",
    name: "BAAI/bge-m3",
    status: "available",
    source: "HuggingFace",
    task: "文本向量化",
    scale: "568M",
    latestVersion: "v1.0",
    size: "2.3 GiB",
    updatedAt: "2026-08-21 11:25",
  },
  {
    id: "mdl_llama31_8b",
    name: "Llama-3.1-8B-Instruct",
    status: "importing",
    source: "HuggingFace",
    task: "文本生成",
    scale: "8B",
    latestVersion: "v1.0",
    size: "16 GiB",
    updatedAt: "2026-08-24 09:18",
  },
  {
    id: "mdl_bge_reranker",
    name: "bge-reranker-v2-m3",
    status: "failed",
    source: "本地上传",
    task: "重排序",
    scale: "568M",
    latestVersion: "v0.9",
    size: "2.2 GiB",
    updatedAt: "2026-08-20 14:06",
  },
];

export type InferenceServiceItem = {
  id: string;
  name: string;
  status: "running" | "deploying" | "stopped" | "error";
  modelVersion: string;
  engine: "vLLM" | "TEI";
  replicas: string;
  endpoint: string;
  createdAt: string;
};

export const inferenceServiceItems: InferenceServiceItem[] = [
  {
    id: "inf_chat_prod",
    name: "infer-chat-prod",
    status: "running",
    modelVersion: "Qwen2.5-72B · v2.1",
    engine: "vLLM",
    replicas: "2 / 2 GPU",
    endpoint: "/v1/chat/completions",
    createdAt: "2026-08-22 17:10",
  },
  {
    id: "inf_embedding",
    name: "embedding-service",
    status: "deploying",
    modelVersion: "BAAI/bge-m3 · v1.0",
    engine: "TEI",
    replicas: "1 / 1 GPU",
    endpoint: "/v1/embeddings",
    createdAt: "2026-08-24 09:24",
  },
  {
    id: "inf_summary",
    name: "summary-dev",
    status: "stopped",
    modelVersion: "Llama-3.1-8B · v1.0",
    engine: "vLLM",
    replicas: "0 / 1 GPU",
    endpoint: "/v1/chat/completions",
    createdAt: "2026-08-19 13:48",
  },
  {
    id: "inf_rerank",
    name: "rerank-api",
    status: "error",
    modelVersion: "bge-reranker-v2-m3 · v0.9",
    engine: "TEI",
    replicas: "0 / 1 GPU",
    endpoint: "/v1/rerank",
    createdAt: "2026-08-20 15:02",
  },
];
