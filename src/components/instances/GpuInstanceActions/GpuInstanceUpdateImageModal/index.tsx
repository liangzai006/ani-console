import { Form, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { InstanceRegistryImageSelect } from "@/components/instances/InstanceRegistryImageSelect";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];

export function GpuInstanceUpdateImageModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<{ imageId: string }>();
  const scope = useIdempotencyScope("gpu-instance-update-image", [
    "POST",
    instance.id,
  ]);
  const mutation = useMutation({
    mutationFn: async ({ imageId }: { imageId: string }) => {
      const submitData = {
        action: "update_image" as const,
        image_id: imageId,
        strategy: "rolling" as const,
      };
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
      Message.success("更新镜像已提交");
      onSubmitted();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  return (
    <Modal
      title={`更新镜像 · ${instance.name}`}
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
        <InstanceRegistryImageSelect
          field="imageId"
          enabled
          instanceKind="gpu_container"
        />
      </Form>
    </Modal>
  );
}
