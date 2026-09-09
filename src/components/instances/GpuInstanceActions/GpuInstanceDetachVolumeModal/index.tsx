import { Form, Input, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];

export function GpuInstanceDetachVolumeModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<{ volumeId: string }>();
  const scope = useIdempotencyScope("gpu-instance-detach-volume", ["POST", instance.id]);
  const mutation = useMutation({
    mutationFn: async ({ volumeId }: { volumeId: string }) => {
      const submitData = {
        action: "detach_volume" as const,
        volume_id: volumeId.trim(),
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
      Message.success("卸载云盘已提交");
      onSubmitted();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  return (
    <Modal
      title={`卸载云盘 · ${instance.name}`}
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
          field="volumeId"
          label="云盘 ID"
          rules={[{ required: true, message: "请输入云盘 ID" }]}
        >
          <Input placeholder="请输入云盘 ID" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
