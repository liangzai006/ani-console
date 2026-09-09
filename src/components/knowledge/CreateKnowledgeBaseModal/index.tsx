import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Select,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { showApiError } from "@/api/helpers";
import { getErrorMessage } from "@/lib/errors";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

type KnowledgeBase = components["schemas"]["KnowledgeBase"];
type Model = components["schemas"]["Model"];

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
  const createScope = useIdempotencyScope("knowledge-base-create", ["POST"]);
  const models = useQuery({
    queryKey: ["models", "knowledge-base-create"],
    enabled: visible,
    queryFn: async () => {
      const { data, error } = await servicesApi.GET("/models", {
        params: { query: { limit: 100, capability: "embedding", status: "ready" } },
      });
      if (error || !data) throw error ?? new Error("Embedding 模型列表未返回结果");
      return data;
    },
  });
  const modelOptions = useMemo(() => {
    const byName = new Map<string, Model>();
    // TODO: ANI /models currently only applies status in the gateway/model-service.
    // TODO: Remove this defensive client filter after capability is also enforced server-side.
    for (const model of models.data?.items ?? []) {
      if (model.status !== "ready" || !model.capabilities?.includes("embedding")) continue;
      byName.set(model.name, model);
    }
    return Array.from(byName.values()).map((model) => ({
      value: model.name,
      label:
        model.display_name && model.display_name !== model.name
          ? `${model.display_name}（${model.name}）`
          : model.name,
    }));
  }, [models.data?.items]);
  useEffect(() => {
    if (!visible || form.getFieldValue("embedding_model") || !modelOptions[0]) return;
    form.setFieldsValue({ embedding_model: modelOptions[0].value });
  }, [form, modelOptions, visible]);
  const create = useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      embedding_model: string;
      chunk_size: number;
      top_k: number;
    }) => {
      const submitData = {
        ...values,
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      };
      const { data, error } = await servicesApi.POST("/knowledge-bases", {
        body: createScope.withKey(submitData),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (item) => {
      createScope.reset();
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
      onCancel={() => {
        createScope.reset();
        form.resetFields();
        onCancel();
      }}
      onOk={() => form.validate().then((values) => create.mutate(values))}
      okButtonProps={{ disabled: models.isLoading || modelOptions.length === 0 }}
      unmountOnExit
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          chunk_size: 800,
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
          label="Embedding 模型"
          field="embedding_model"
          rules={[{ required: true, message: "请选择 Embedding 模型" }]}
        >
          <Select
            loading={models.isLoading}
            options={modelOptions}
            showSearch
            placeholder="请选择已就绪的 Embedding 模型"
          />
        </Form.Item>
        {models.error ? (
          <div className="flex flex-col items-start gap-2">
            <Alert
              type="warning"
              showIcon
              content={getErrorMessage(models.error, "Embedding 模型列表加载失败")}
            />
            <Button size="small" onClick={() => void models.refetch()}>
              重新加载模型
            </Button>
          </div>
        ) : !models.isLoading && modelOptions.length === 0 ? (
          <Alert
            type="warning"
            showIcon
            content="暂无已就绪的 Embedding 模型，暂时无法创建知识库"
          />
        ) : null}
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
