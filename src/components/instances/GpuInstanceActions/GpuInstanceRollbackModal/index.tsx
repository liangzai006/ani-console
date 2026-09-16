import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Form, Input, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";

import { validateForm } from "@/lib/form";

type Instance = InstanceRecord;

export function GpuInstanceRollbackModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<{ revision: string }>();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "操作",
        successText: "回滚发布已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async ({ revision }: { revision: string }) => {
      const submitData = {
        action: "rollback" as const,
        revision: revision.trim(),
      };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onSubmitted();
    },
  });
  return (
    <Modal
      title={`回滚发布 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={() => {
        onCancel();
      }}
      onOk={async () => mutation.mutate(await validateForm(form))}
      unmountOnExit
    >
      <Form form={form} layout="vertical">
        <Form.Item
          field="revision"
          label="目标修订版本"
          rules={[{ required: true, message: "请输入目标修订版本" }]}
        >
          <Input placeholder="请输入 revision" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
