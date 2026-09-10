import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceLifecycleInput, InstanceRecord } from "@/api/instances";
import { Form, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { GpuInstanceResizeFields } from "@/components/instances/GpuInstanceResizeFields";
import {
  buildGpuInstanceResizeFields,
  getGpuInstanceResizeInitialValues,
  isGpuInstanceResizeUnchanged,
  type GpuInstanceResizeFormValues,
} from "@/components/instances/GpuInstanceResizeFields/helpers";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = InstanceRecord;

export function GpuInstanceResizeModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<GpuInstanceResizeFormValues>();
  const mutation = useMutation({
    mutationFn: async (values: GpuInstanceResizeFormValues) => {
      const submitData = {
        action: "resize" as const,
        ...buildGpuInstanceResizeFields(values),
      } satisfies InstanceLifecycleInput;
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      Message.success("变配已提交");
      onSubmitted();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  return (
    <Modal
      title={`变配 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      okText="确认变配"
      onCancel={() => {
        onCancel();
      }}
      onOk={async () => {
        const values = await form.validate();
        if (isGpuInstanceResizeUnchanged(instance, values)) {
          Message.info("规格未变化");
          return;
        }
        mutation.mutate(values);
      }}
      unmountOnExit
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={getGpuInstanceResizeInitialValues(instance)}
      >
        <GpuInstanceResizeFields instance={instance} enabled />
      </Form>
    </Modal>
  );
}
