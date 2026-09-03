import { Form, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { GpuInstanceResizeFields } from "@/components/instances/GpuInstanceResizeFields";
import {
  buildGpuInstanceResizeFields,
  getGpuInstanceResizeInitialValues,
  isGpuInstanceResizeUnchanged,
  type GpuInstanceResizeFormValues,
} from "@/components/instances/GpuInstanceResizeFields/helpers";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];
type LifecycleRequest = components["schemas"]["InstanceLifecycleRequest"];

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
  const scope = useIdempotencyScope("gpu-instance-resize", [
    "POST",
    instance.id,
  ]);
  const mutation = useMutation({
    mutationFn: async (values: GpuInstanceResizeFormValues) => {
      const submitData = {
        action: "resize" as const,
        ...buildGpuInstanceResizeFields(values),
      } as Omit<LifecycleRequest, "idempotency_key">;
      const { error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instance.id } },
          body: scope.withKey(submitData) as LifecycleRequest,
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
      Message.success("变配已提交");
      onSubmitted();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  return (
    <Modal
      title={`变配 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      okText="确认变配"
      onCancel={() => {
        scope.reset();
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
