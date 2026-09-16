import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Form, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { InstanceRegistryImageSelect } from "@/components/instances/InstanceRegistryImageSelect";

import { validateForm } from "@/lib/form";

type Instance = InstanceRecord;

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
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "操作",
        successText: "更新镜像已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async ({ imageId }: { imageId: string }) => {
      const submitData = {
        action: "update_image" as const,
        image_id: imageId,
        strategy: "rolling" as const,
      };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onSubmitted();
    },
  });
  return (
    <Modal
      title={`更新镜像 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={() => {
        onCancel();
      }}
      onOk={async () => mutation.mutate(await validateForm(form))}
      unmountOnExit
    >
      <Form form={form} layout="vertical">
        <InstanceRegistryImageSelect field="imageId" enabled instanceKind="gpu_container" />
      </Form>
    </Modal>
  );
}
