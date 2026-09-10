import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Form, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { InstanceRegistryImageSelect } from "@/components/instances/InstanceRegistryImageSelect";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = InstanceRecord;

export function ContainerInstanceUpdateImageModal({
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
    mutationFn: async ({ imageId }: { imageId: string }) => {
      const submitData = {
        action: "update_image" as const,
        image_id: imageId,
        strategy: "rolling" as const,
      };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      Message.success("更新镜像已提交");
      onSubmitted();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  const cancel = () => {
    onCancel();
  };

  return (
    <Modal
      title={`更新镜像 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={cancel}
      onOk={async () => mutation.mutate(await form.validate())}
      unmountOnExit
    >
      <Form form={form} layout="vertical">
        <InstanceRegistryImageSelect field="imageId" enabled instanceKind="container" />
      </Form>
    </Modal>
  );
}
