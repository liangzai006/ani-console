import { listSecrets } from "@/api/secrets";
import { applyInstanceLifecycle } from "@/api/instances";
import type { Secret } from "@/api/secrets";
import type { InstanceRecord } from "@/api/instances";
import { Form, Input, Modal, Select } from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { validateForm } from "@/lib/form";

type Instance = InstanceRecord;
type Values = {
  secretId: string;
  bindingType: "env" | "file";
  envName?: string;
  mountPath?: string;
};

export function GpuInstanceBindSecretModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<Values>();
  const [bindingType, setBindingType] = useState<"env" | "file">("env");
  const secrets = useQuery({
    meta: {
      errorNotification: {
        id: "secrets",
        action: "密钥列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["secrets", "gpu-instance-bind-secret"],
    queryFn: () => listSecrets({ limit: 100 }),
  });
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "操作",
        successText: "绑定密钥已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async (values: Values) => {
      const submitData = {
        action: "bind_secret" as const,
        secret_id: values.secretId,
        binding_type: values.bindingType,
        env_name: values.bindingType === "env" ? values.envName?.trim() : undefined,
        mount_path: values.bindingType === "file" ? values.mountPath?.trim() : undefined,
      };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onSubmitted();
    },
  });
  const options = ((secrets.data?.items ?? []) as Secret[]).filter((secret) => secret.id);
  return (
    <Modal
      title={`绑定密钥 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={() => {
        onCancel();
      }}
      onOk={async () => mutation.mutate(await validateForm(form))}
      unmountOnExit
    >
      <Form form={form} layout="vertical" initialValues={{ bindingType: "env" }}>
        <Form.Item
          field="secretId"
          label="密钥"
          rules={[{ required: true, message: "请选择密钥" }]}
        >
          <Select
            loading={secrets.isLoading}
            placeholder="请选择已创建的密钥"
            showSearch
            allowClear
            options={options.map((secret) => ({
              label: secret.name ?? secret.id ?? "未命名密钥",
              value: secret.id!,
            }))}
          />
        </Form.Item>
        <Form.Item
          field="bindingType"
          label="绑定方式"
          rules={[{ required: true, message: "请选择绑定方式" }]}
        >
          <Select
            options={[
              { label: "环境变量", value: "env" },
              { label: "文件", value: "file" },
            ]}
            onChange={setBindingType}
          />
        </Form.Item>
        {bindingType === "file" ? (
          <Form.Item
            field="mountPath"
            label="挂载路径"
            rules={[{ required: true, message: "请输入挂载路径" }]}
          >
            <Input placeholder="例如 /data" />
          </Form.Item>
        ) : (
          <Form.Item
            field="envName"
            label="环境变量名"
            rules={[{ required: true, message: "请输入环境变量名" }]}
          >
            <Input placeholder="例如 API_KEY" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
