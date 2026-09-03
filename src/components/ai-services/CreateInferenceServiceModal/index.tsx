import {
  Alert,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Select,
  Typography,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { servicesApi } from "@/api/services-client";
import { showApiError } from "@/api/helpers";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

const PROTOTYPE_MODEL_VERSIONS = [
  {
    id: "qwen2-7b@v1.0.0",
    model: "qwen2-7b",
    version: "v1.0.0",
    label: "qwen2-7b · v1.0.0",
    kind: "chat",
  },
  {
    id: "llama3-8b@v0.9.1",
    model: "llama3-8b",
    version: "v0.9.1",
    label: "llama3-8b · v0.9.1",
    kind: "chat",
  },
  {
    id: "embed-bge@v2.0.0",
    model: "embed-bge",
    version: "v2.0.0",
    label: "embed-bge · v2.0.0",
    kind: "embedding",
  },
  {
    id: "qwen2-72b@v1.1.0",
    model: "qwen2-72b",
    version: "v1.1.0",
    label: "qwen2-72b · v1.1.0",
    kind: "chat",
  },
] as const;

const RESOURCE_PRESETS = {
  "a10-1": {
    label: "1×A10",
    cpu: "4",
    memory: "16Gi",
    accelerator: { spec_id: "A10", count_per_replica: 1 },
  },
  "a100-1": {
    label: "1×A100",
    cpu: "8",
    memory: "32Gi",
    accelerator: { spec_id: "A100", count_per_replica: 1 },
  },
  "a100-2": {
    label: "2×A100",
    cpu: "16",
    memory: "64Gi",
    accelerator: { spec_id: "A100", count_per_replica: 2 },
  },
  cpu: { label: "2C4G CPU", cpu: "2", memory: "4Gi" },
} as const;

type ResourcePresetKey = keyof typeof RESOURCE_PRESETS;
type InferenceEngine = "vllm" | "sglang";

type RuntimeImage = {
  id: string;
  repository: string;
  label: string;
};

type CreateInferenceServiceModalProps = {
  visible: boolean;
  onCancel: () => void;
  initialServiceName?: string;
  initialModelVersionId?: string;
};

export function CreateInferenceServiceModal({
  visible,
  onCancel,
  initialServiceName,
  initialModelVersionId,
}: CreateInferenceServiceModalProps) {
  const qc = useQueryClient();
  const createScope = useIdempotencyScope("inference-service-create", ["POST"]);
  const [name, setName] = useState("");
  const [modelVersionId, setModelVersionId] = useState<string>(
    PROTOTYPE_MODEL_VERSIONS[0].id,
  );
  const [replicas, setReplicas] = useState(1);
  const [resourcePreset, setResourcePreset] =
    useState<ResourcePresetKey>("a10-1");
  const [inferenceEngine, setInferenceEngine] =
    useState<InferenceEngine>("vllm");
  const selectedModel = useMemo(
    () => PROTOTYPE_MODEL_VERSIONS.find((item) => item.id === modelVersionId),
    [modelVersionId],
  );
  const isEmbeddingModel = selectedModel?.kind === "embedding";
  const runtimeImageKeyword = isEmbeddingModel
    ? "tei"
    : inferenceEngine === "sglang"
      ? "sglang"
      : "vllm";
  const recommendedEngine = isEmbeddingModel
    ? "TEI"
    : inferenceEngine === "sglang"
      ? "SGLang"
      : "vLLM";

  const runtimeImages = useQuery({
    queryKey: ["inference-runtime-images", runtimeImageKeyword],
    enabled: visible,
    queryFn: async () => {
      const { data: projectData, error: projectError } = await coreApi.GET(
        "/registry/projects",
        { params: { query: { limit: 50 } } },
      );
      if (projectError) throw projectError;
      const images: RuntimeImage[] = [];
      for (const project of projectData?.items ?? []) {
        const { data: repoData, error: repoError } = await coreApi.GET(
          "/registry/projects/{project}/repositories",
          {
            params: {
              path: { project: project.name },
              query: asUncontractedQuery({
                limit: 50,
                search_field: "name",
                keyword: runtimeImageKeyword,
              }),
            },
          },
        );
        if (repoError) throw repoError;
        for (const repository of repoData?.items ?? []) {
          const { data: artifactData, error: artifactError } =
            await coreApi.GET(
              "/registry/projects/{project}/repositories/{repository}/artifacts",
              {
                params: {
                  path: { project: project.name, repository: repository.name },
                  query: { limit: 50 },
                },
              },
            );
          if (artifactError) throw artifactError;
          for (const artifact of artifactData?.items ?? []) {
            const tag = artifact.tags[0];
            if (!tag) continue;
            images.push({
              id: `${artifact.project}/${artifact.repository}:${tag}`,
              repository: artifact.repository.toLowerCase(),
              label: `${artifact.project}/${artifact.repository}:${tag}`,
            });
          }
        }
      }
      return images;
    },
  });

  const compatible = Boolean(selectedModel);
  // TODO: Registry 后端确认按运行引擎过滤镜像后，移除此处创建表单的本地兜底过滤。
  const runtimeImage = useMemo(() => {
    const keywords = isEmbeddingModel
      ? ["text-embedding", "tei"]
      : inferenceEngine === "sglang"
        ? ["sglang"]
        : ["vllm"];
    return (runtimeImages.data ?? []).find((image) =>
      keywords.some((keyword) => image.repository.includes(keyword)),
    );
  }, [inferenceEngine, isEmbeddingModel, runtimeImages.data]);

  useEffect(() => {
    if (!visible) return;
    setName(initialServiceName ?? "");
    setModelVersionId(
      PROTOTYPE_MODEL_VERSIONS.some((item) => item.id === initialModelVersionId)
        ? initialModelVersionId!
        : PROTOTYPE_MODEL_VERSIONS[0].id,
    );
    setReplicas(1);
    setResourcePreset("a10-1");
    setInferenceEngine("vllm");
  }, [initialModelVersionId, initialServiceName, visible]);

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !modelVersionId)
        throw new Error("请完整填写服务名称并选择模型版本");
      if (!compatible) throw new Error("所选模型版本未通过兼容性检查");
      if (!runtimeImage)
        throw new Error(`Registry 中没有可用的 ${recommendedEngine} 运行镜像`);
      const preset = RESOURCE_PRESETS[resourcePreset];
      const accelerator =
        "accelerator" in preset ? preset.accelerator : undefined;
      const submitData = {
        name: name.trim(),
        model: selectedModel?.model ?? modelVersionId,
        model_version_id: modelVersionId,
        served_model_name: selectedModel?.model,
        image_id: runtimeImage.id,
        replicas,
        placement_mode: "auto" as const,
        resources: {
          cpu: preset.cpu,
          memory: preset.memory,
          ...(accelerator ? { accelerator } : {}),
        },
      };
      const { data, error } = await servicesApi.POST("/inference-services", {
        body: createScope.withKey(submitData),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      createScope.reset();
      Message.success("推理服务部署请求已提交");
      void qc.invalidateQueries({ queryKey: ["inference-services"] });
      onCancel();
    },
    onError: (error) => showApiError(error),
  });

  return (
    <Modal
      visible={visible}
      title="一键部署推理服务"
      okText="开始部署"
      onCancel={() => {
        createScope.reset();
        onCancel();
      }}
      onOk={() => create.mutateAsync()}
      confirmLoading={create.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="服务名称" required>
          <Input
            value={name}
            onChange={setName}
            placeholder="例如 qwen-service"
            maxLength={63}
          />
        </Form.Item>
        <Form.Item label="模型版本" required>
          <Select
            value={modelVersionId}
            onChange={setModelVersionId}
            options={PROTOTYPE_MODEL_VERSIONS.map((item) => ({
              value: item.id,
              label: item.label,
            }))}
          />
        </Form.Item>
        <Form.Item label="兼容性检查">
          <Alert
            type={compatible ? "success" : "warning"}
            content={
              compatible
                ? `已通过 · ${recommendedEngine} / ${RESOURCE_PRESETS[resourcePreset].label}`
                : "请选择已就绪的模型版本"
            }
          />
        </Form.Item>
        <Form.Item label="推理引擎">
          {isEmbeddingModel ? (
            <Input value={compatible ? "TEI" : "-"} readOnly />
          ) : (
            <Select
              value={inferenceEngine}
              onChange={setInferenceEngine}
              disabled={!compatible}
              options={[
                { value: "vllm", label: "vLLM" },
                { value: "sglang", label: "SGLang" },
              ]}
            />
          )}
        </Form.Item>
        {runtimeImages.isLoading ? (
          <Alert type="info" content="正在匹配租户 Registry 中的运行镜像…" />
        ) : runtimeImage ? (
          <Alert
            type="success"
            content={`运行镜像已匹配：${runtimeImage.label}`}
          />
        ) : (
          <Alert
            type="warning"
            content={`未找到 ${recommendedEngine} 运行镜像，请先在 Registry 中准备对应镜像后再部署。`}
          />
        )}
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item label="资源规格" required>
            <Select
              value={resourcePreset}
              onChange={setResourcePreset}
              options={Object.entries(RESOURCE_PRESETS).map(
                ([value, preset]) => ({ value, label: preset.label }),
              )}
            />
          </Form.Item>
          <Form.Item label="副本" required>
            <InputNumber
              value={replicas}
              onChange={(value) => setReplicas(value ?? 1)}
              min={1}
              precision={0}
              className="w-full"
            />
          </Form.Item>
        </div>
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item label="VPC / 子网">
            <Input value="平台自动分配（后端暂未开放选择）" readOnly />
          </Form.Item>
          <Form.Item label="调用鉴权">
            <Input value="使用租户 API Key" readOnly />
          </Form.Item>
        </div>
        <Typography.Text type="secondary">
          部署后通过 OpenAI 兼容 API 调用；请求提交后服务将依次进入 pending /
          deploying / running。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
