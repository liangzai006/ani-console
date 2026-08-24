import {
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
} from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { showApiError } from "@/api/helpers";
import { newIdempotencyKey } from "@/lib/idempotency";

type KnowledgeBase = components["schemas"]["KnowledgeBase"];

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
  const create = useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      embedding_model?: string;
      chunk_size: number;
      top_k: number;
      score_threshold: number;
    }) => {
      const { data, error } = await servicesApi.POST("/knowledge-bases", {
        body: {
          ...values,
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
          embedding_model: values.embedding_model?.trim() || undefined,
          idempotency_key: newIdempotencyKey(),
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (item) => {
      Message.success("知识库已创建");
      qc.invalidateQueries({ queryKey: ["knowledge-bases"] });
      form.resetFields();
      onCancel();
      onCreated?.(item);
    },
    onError: (error) => showApiError(error, "创建知识库失败"),
  });
  return (
    <Modal
      title="创建知识库"
      visible={visible}
      confirmLoading={create.isPending}
      onCancel={onCancel}
      onOk={() => form.validate().then((values) => create.mutate(values))}
      unmountOnExit
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ chunk_size: 1024, top_k: 5, score_threshold: 0.3 }}
      >
        <Form.Item
          label="名称"
          field="name"
          rules={[
            { required: true, message: "请输入知识库名称" },
            { maxLength: 128 },
          ]}
        >
          <Input placeholder="例如：产品资料库" />
        </Form.Item>
        <Form.Item label="描述" field="description">
          <Input.TextArea
            placeholder="说明知识库的内容和用途"
            maxLength={500}
            showWordLimit
          />
        </Form.Item>
        <Form.Item
          label="Embedding 模型"
          field="embedding_model"
          tooltip="不填写时使用后端默认模型"
        >
          <Input placeholder="例如：bge-m3" />
        </Form.Item>
        <div className="grid grid-cols-3 gap-4">
          <Form.Item
            label="分块大小"
            field="chunk_size"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={8192} />
          </Form.Item>
          <Form.Item
            label="默认 TopK"
            field="top_k"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={20} />
          </Form.Item>
          <Form.Item
            label="相似度阈值"
            field="score_threshold"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={1} step={0.05} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
