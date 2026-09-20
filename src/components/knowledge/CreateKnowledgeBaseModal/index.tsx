import { listModels } from "@/api/ai-services/models";
import { Form, Input, InputNumber, Modal, Select } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import {
  createKnowledgeBase,
  type CreateKnowledgeBaseInput,
  type KnowledgeBase,
} from "@/api/knowledge";
import { getReadyModelOptions } from "@/lib/ai-models";
import { validateForm } from "@/lib/form";
import { withId } from "@/lib/id";

type CreateKnowledgeBaseFormValues = CreateKnowledgeBaseInput & {
  embedding_model: string;
  chunk_size: number;
  top_k: number;
};

export function CreateKnowledgeBaseModal({
  visible,
  onCancel,
  onCreated,
}: {
  visible: boolean;
  onCancel: () => void;
  onCreated?: (item: KnowledgeBase) => void;
}) {
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const embeddingModels = useQuery({
    meta: {
      errorNotification: {
        id: withId("models", "embedding"),
        action: "向量化模型列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["models", "knowledge-base-create", "embedding"],
    enabled: visible,
    queryFn: () => listModels({ limit: 100, capability: "embedding", status: "ready" }),
  });
  const inferenceModels = useQuery({
    meta: {
      errorNotification: {
        id: withId("models", "inference"),
        action: "推理模型列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["models", "knowledge-base-create", "text-generation"],
    enabled: visible,
    queryFn: () => listModels({ limit: 100, capability: "text-generation", status: "ready" }),
  });
  const embeddingModelOptions = useMemo(
    () => getReadyModelOptions(embeddingModels.data?.items, "embedding"),
    [embeddingModels.data?.items],
  );
  const inferenceModelOptions = useMemo(
    () => getReadyModelOptions(inferenceModels.data?.items, "text-generation"),
    [inferenceModels.data?.items],
  );
  useEffect(() => {
    if (!visible || form.getFieldValue("embedding_model") || !embeddingModelOptions[0]) return;
    form.setFieldsValue({ embedding_model: embeddingModelOptions[0].value });
  }, [embeddingModelOptions, form, visible]);
  const create = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "创建知识库",
        successText: "知识库已创建",
        errorFallback: "创建知识库失败",
      },
    },
    mutationFn: async (values: {
      name: string;
      description?: string;
      embedding_model: string;
      default_inference_service?: string;
      chunk_size: number;
      top_k: number;
    }) => {
      const submitData = {
        ...values,
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        default_inference_service: values.default_inference_service || undefined,
      };
      return createKnowledgeBase(submitData);
    },
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ["knowledge-bases"] });
      form.resetFields();
      onCancel();
      onCreated?.(item);
    },
  });
  return (
    <Modal
      title="创建知识库"
      visible={visible}
      confirmLoading={create.isPending}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() =>
        validateForm<CreateKnowledgeBaseFormValues>(form).then((values) => create.mutate(values))
      }
      okButtonProps={{
        disabled: embeddingModels.isLoading || embeddingModelOptions.length === 0,
      }}
      unmountOnExit
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          chunk_size: 1024,
          top_k: 5,
        }}
      >
        <Form.Item
          label="名称"
          field="name"
          rules={[{ required: true, message: "请输入知识库名称" }, { maxLength: 128 }]}
        >
          <Input placeholder="例如：产品资料库" />
        </Form.Item>
        <Form.Item label="描述" field="description">
          <Input.TextArea placeholder="说明知识库的内容和用途" maxLength={500} showWordLimit />
        </Form.Item>
        <Form.Item
          label="向量化模型"
          field="embedding_model"
          rules={[{ required: true, message: "请选择 向量化模型" }]}
        >
          <Select
            loading={embeddingModels.isLoading}
            showSearch
            filterOption={(inputValue, option) => {
              const normalizedInput = inputValue.trim().toLowerCase();
              const optionValue = String(option.props.value).toLowerCase();
              const optionLabel = String(option.props.extra ?? "").toLowerCase();

              return optionValue.includes(normalizedInput) || optionLabel.includes(normalizedInput);
            }}
            renderFormat={(option, value) => (
              <span title={String(option?.extra ?? value)}>{String(value)}</span>
            )}
            placeholder="请选择已就绪的 向量化模型"
          >
            {embeddingModelOptions.map((option) => (
              <Select.Option
                key={option.value}
                value={option.value}
                extra={option.label}
                title={option.label}
              >
                {option.value}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label="默认推理模型"
          field="default_inference_service"
          extra="可选；未设置时由平台默认模型处理问答，创建后也可在单次问答中临时切换。"
        >
          <Select
            allowClear
            showSearch
            loading={inferenceModels.isLoading}
            disabled={inferenceModels.isLoading || inferenceModelOptions.length === 0}
            filterOption={(inputValue, option) => {
              const normalizedInput = inputValue.trim().toLowerCase();
              const optionValue = String(option.props.value).toLowerCase();
              const optionLabel = String(option.props.extra ?? "").toLowerCase();

              return optionValue.includes(normalizedInput) || optionLabel.includes(normalizedInput);
            }}
            renderFormat={(option, value) => (
              <span title={String(option?.extra ?? value)}>{String(value)}</span>
            )}
            placeholder="使用平台默认模型"
          >
            {inferenceModelOptions.map((option) => (
              <Select.Option
                key={option.value}
                value={option.value}
                extra={option.label}
                title={option.label}
              >
                {option.value}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item label="分块大小" field="chunk_size" rules={[{ required: true }]}>
            <InputNumber min={1} max={8192} className="w-full" />
          </Form.Item>
          <Form.Item label="默认 TopK" field="top_k" rules={[{ required: true }]}>
            <InputNumber min={1} max={20} className="w-full" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
