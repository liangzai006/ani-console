import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Typography,
} from "@arco-design/web-react";
import { useState } from "react";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import { listOrThrow } from "@/lib/api-list";
import { getErrorMessage } from "@/lib/errors";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

type VectorStore = components["schemas"]["VectorStore"];
type VectorMetric = components["schemas"]["CreateVectorStoreRequest"]["metric"];
type Model = components["schemas"]["ModelCatalogItem"];

const DEFAULT_EMBEDDING_MODELS = [
  "bge-m3",
  "text-embedding-v3",
  "gte-large-zh",
];

export function CreateVectorStoreModal({
  visible,
  onCancel,
  onCreated,
}: {
  visible: boolean;
  onCancel: () => void;
  onCreated?: (store: VectorStore) => void;
}) {
  const qc = useQueryClient();
  const createScope = useIdempotencyScope("storage-vector-store-create", ["POST"]);
  const [name, setName] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("bge-m3");
  const [dimension, setDimension] = useState(1536);
  const [metric, setMetric] = useState<VectorMetric>("cosine");
  const models = useQuery({
    queryKey: ["models", "vector-store-create"],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/models", {
          params: { query: asUncontractedQuery({ limit: 100, capability: "embedding" }) },
        }),
      ),
    enabled: visible,
  });
  // TODO: 模型接口确认按 capability 过滤后，移除此处创建表单的本地兜底过滤。
  const modelOptions = Array.from(
    new Set([
      ...((models.data?.items ?? []) as Model[])
        .filter(
          (item) =>
            item.capabilities.includes("embedding") ||
            /embed|bge|gte/i.test(item.name),
        )
        .map((item) => item.name),
      ...DEFAULT_EMBEDDING_MODELS,
    ]),
  );
  const reset = () => {
    createScope.reset();
    setName("");
    setEmbeddingModel("bge-m3");
    setDimension(1536);
    setMetric("cosine");
  };
  const create = useMutation({
    mutationFn: async (_: undefined) => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("请输入向量存储名称");
      if (!embeddingModel) throw new Error("请选择 Embedding 模型");
      if (!Number.isInteger(dimension) || dimension < 1)
        throw new Error("向量维度必须是大于 0 的整数");
      const submitData = {
        name: trimmedName,
        embedding_model: embeddingModel,
        dimension,
        metric,
      };
      const { data, error } = await coreApi.POST("/vector-stores", {
        body: createScope.withKey(submitData),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["vector-stores"] });
      reset();
      onCreated?.(data);
      onCancel();
    },
    onError: (error) => showApiError(error),
  });
  return (
    <Modal
      visible={visible}
      title="创建向量存储"
      onCancel={() => {
        reset();
        onCancel();
      }}
      onOk={() => create.mutateAsync(undefined)}
      confirmLoading={create.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="名称" required>
          <Input
            value={name}
            onChange={setName}
            placeholder="请输入向量存储名称"
            maxLength={64}
            showWordLimit
          />
        </Form.Item>
        <Form.Item label="Embedding 模型" required>
          <Select
            value={embeddingModel}
            onChange={setEmbeddingModel}
            loading={models.isLoading}
            showSearch
            placeholder="请选择 Embedding 模型"
          >
            {modelOptions.map((model) => (
              <Select.Option key={model} value={model}>
                {model}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {models.error ? (
          <Alert
            type="warning"
            showIcon
            content={getErrorMessage(
              models.error,
              "模型列表加载失败，当前展示默认 Embedding 模型",
            )}
          />
        ) : null}
        <Form.Item label="向量维度" required>
          <InputNumber
            value={dimension}
            min={1}
            precision={0}
            className="w-full"
            onChange={(value) => setDimension(Number(value ?? 1))}
          />
        </Form.Item>
        <Form.Item label="距离度量" required>
          <Select value={metric} onChange={setMetric}>
            <Select.Option value="cosine">Cosine · 余弦相似度</Select.Option>
            <Select.Option value="l2">L2 · 欧氏距离</Select.Option>
            <Select.Option value="ip">IP · 内积</Select.Option>
          </Select>
        </Form.Item>
        <Typography.Text type="secondary">
          维度和距离度量创建后不可修改，请与写入数据的嵌入模型保持一致。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
