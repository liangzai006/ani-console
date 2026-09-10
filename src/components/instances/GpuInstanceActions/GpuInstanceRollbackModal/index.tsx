import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Form, Input, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

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
    mutationFn: async ({ revision }: { revision: string }) => {
      const submitData = {
        action: "rollback" as const,
        revision: revision.trim(),
      };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      Message.success("回滚发布已提交");
      onSubmitted();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  return (
    <Modal
      title={`回滚发布 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={() => {
        onCancel();
      }}
      onOk={async () => mutation.mutate(await form.validate())}
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
