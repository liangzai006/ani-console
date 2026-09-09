import { Form, Input, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];

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
  const scope = useIdempotencyScope("gpu-instance-rollback", ["POST", instance.id]);
  const mutation = useMutation({
    mutationFn: async ({ revision }: { revision: string }) => {
      const submitData = {
        action: "rollback" as const,
        revision: revision.trim(),
      };
      const { error, response } = await coreApi.POST("/instances/{instance_id}/lifecycle", {
        params: { path: { instance_id: instance.id } },
        body: scope.withKey(submitData),
      });
      if (error)
        throw {
          ...(typeof error === "object" && error ? error : { message: String(error) }),
          status: response.status,
        };
    },
    onSuccess: () => {
      scope.reset();
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
        scope.reset();
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
