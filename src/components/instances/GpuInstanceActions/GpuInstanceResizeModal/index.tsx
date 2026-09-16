import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceLifecycleInput, InstanceRecord } from "@/api/instances";
import { Form, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { GpuInstanceResizeFields } from "@/components/instances/GpuInstanceResizeFields";
import {
  buildGpuInstanceResizeFields,
  getGpuInstanceResizeInitialValues,
  isGpuInstanceResizeUnchanged,
  type GpuInstanceResizeFormValues,
} from "@/components/instances/GpuInstanceResizeFields/helpers";

import { showMessage } from "@/lib/feedback";
import { validateForm } from "@/lib/form";

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
    meta: {
      feedback: {
        channel: "message",
        action: "操作",
        successText: "变配已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async (values: GpuInstanceResizeFormValues) => {
      const submitData = {
        action: "resize" as const,
        ...buildGpuInstanceResizeFields(values),
      } satisfies InstanceLifecycleInput;
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onSubmitted();
    },
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
        const values = await validateForm<GpuInstanceResizeFormValues>(form);
        if (isGpuInstanceResizeUnchanged(instance, values)) {
          showMessage({ type: "info", content: "规格未变化" });
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
