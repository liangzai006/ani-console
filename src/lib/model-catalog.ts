import type { Model, ModelVersion } from "@/api/ai-services/models";

export type { Model, ModelVersion } from "@/api/ai-services/models";

export const MODEL_SOURCE_LABELS: Record<Model["source"], string> = {
  upload: "本地上传",
  huggingface: "HuggingFace",
  modelscope: "ModelScope",
  builtin: "内置",
};

const MODEL_CAPABILITY_LABELS: Record<string, string> = {
  "text-generation": "文本生成",
  embedding: "文本向量化",
  "speech-to-text": "语音识别",
};

export function formatModelCapabilities(capabilities: string[] | undefined) {
  return capabilities?.map((item) => MODEL_CAPABILITY_LABELS[item] ?? item).join("、") || "-";
}

export function getLatestModelVersion(model: Model): ModelVersion | undefined {
  return [...(model.versions ?? [])].sort(
    (left, right) => Date.parse(right.created_at) - Date.parse(left.created_at),
  )[0];
}

export function isEmbeddingModel(model: Model | undefined) {
  return model?.capabilities?.includes("embedding") ?? false;
}
