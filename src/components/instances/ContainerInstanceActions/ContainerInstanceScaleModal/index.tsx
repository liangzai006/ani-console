import { Form, InputNumber, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];

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
  const scope = useIdempotencyScope("container-instance-scale", [
    "POST",
    instance.id,
  ]);
  const mutation = useMutation({
    mutationFn: async ({ replicas }: { replicas: number }) => {
      const submitData = { action: "scale" as const, replicas };
      const { error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instance.id } },
          body: scope.withKey(submitData),
        },
      );
      if (error)
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error) }),
          status: response.status,
        };
    },
    onSuccess: () => {
      scope.reset();
      Message.success("扩缩容已提交");
      onSubmitted();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  const cancel = () => {
    scope.reset();
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
