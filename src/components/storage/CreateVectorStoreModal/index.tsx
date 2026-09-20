import { listModels } from "@/api/ai-services/models";
import {
  createVectorStore,
  type VectorMetric,
  type VectorStore,
} from "@/api/storage/vector-stores";
import { withId } from "@/lib/id";
import { Form, Input, InputNumber, Modal, Select, Typography } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

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
  const [name, setName] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("");
  const [dimension, setDimension] = useState(1536);
  const [metric, setMetric] = useState<VectorMetric>("cosine");
  const models = useQuery({
    meta: {
      errorNotification: {
        id: withId("models", "embedding"),
        action: "向量化模型列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["models", "vector-store-create"],
    queryFn: () => listModels({ limit: 100, capability: "embedding", status: "ready" }),
    enabled: visible,
  });
  const modelOptions = useMemo(
    () => Array.from(new Set((models.data?.items ?? []).map((item) => item.name))),
    [models.data?.items],
  );
  useEffect(() => {
    if (!visible || embeddingModel || !modelOptions[0]) return;
    setEmbeddingModel(modelOptions[0]);
  }, [embeddingModel, modelOptions, visible]);
  const reset = () => {
    setName("");
    setEmbeddingModel("");
    setDimension(1536);
    setMetric("cosine");
  };
  const create = useMutation({
    meta: { feedback: { channel: "message", action: "创建", errorFallback: "请求失败" } },
    mutationFn: async (_: undefined) => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("请输入向量存储名称");
      if (!embeddingModel) throw new Error("请选择 向量化模型");
      if (!Number.isInteger(dimension) || dimension < 1)
        throw new Error("向量维度必须是大于 0 的整数");
      const submitData = {
        name: trimmedName,
        embedding_model: embeddingModel,
        dimension,
        metric,
      };
      return createVectorStore(submitData);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["vector-stores"] });
      reset();
      onCreated?.(data);
      onCancel();
    },
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
        <Form.Item label="向量化模型" required>
          <Select
            value={embeddingModel}
            onChange={setEmbeddingModel}
            loading={models.isLoading}
            showSearch
            placeholder="请选择 向量化模型"
          >
            {modelOptions.map((model) => (
              <Select.Option key={model} value={model}>
                {model}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
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
