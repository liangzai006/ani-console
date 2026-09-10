import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Form, InputNumber, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = InstanceRecord;

export function ContainerInstanceScaleModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<{ replicas: number }>();
  const mutation = useMutation({
    mutationFn: async ({ replicas }: { replicas: number }) => {
      const submitData = { action: "scale" as const, replicas };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      Message.success("扩缩容已提交");
      onSubmitted();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  const cancel = () => {
    onCancel();
  };

  return (
    <Modal
      title={`扩缩容 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={cancel}
      onOk={async () => mutation.mutate(await form.validate())}
      unmountOnExit
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ replicas: instance.container?.replicas ?? 1 }}
      >
        <Form.Item
          field="replicas"
          label="副本数"
          rules={[{ required: true, message: "请输入副本数" }]}
        >
          <InputNumber min={1} precision={0} className="w-full" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
