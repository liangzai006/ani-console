import { Alert, Form, Message, Modal, Select } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { CONTAINER_CPU_MEMORY_SPECS } from "@/lib/container-instance-specs";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];
type Values = { spec: string };

function getCurrentResizeSpec(instance: Instance) {
  const cpu = String(instance.compute?.cpu ?? "")
    .trim()
    .replace(/C$/i, "");
  const memory = String(instance.compute?.memory ?? "").trim();
  const memoryAmount = memory.match(/^(\d+(?:\.\d+)?)(?:Gi|G)?$/i)?.[1];

  if (!cpu || !memoryAmount) return CONTAINER_CPU_MEMORY_SPECS[2];

  return {
    value: `${cpu}C${memoryAmount}G`,
    cpu,
    memory: `${memoryAmount}Gi`,
  };
}

export function ContainerInstanceResizeModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<Values>();
  const currentSpec = getCurrentResizeSpec(instance);
  const resizeSpecs = CONTAINER_CPU_MEMORY_SPECS.some(
    (option) => option.value === currentSpec.value,
  )
    ? [...CONTAINER_CPU_MEMORY_SPECS]
    : [currentSpec, ...CONTAINER_CPU_MEMORY_SPECS];
  const scope = useIdempotencyScope("container-instance-resize", [
    "POST",
    instance.id,
  ]);
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const spec = resizeSpecs.find((option) => option.value === values.spec);
      if (!spec) throw new Error("请选择有效的规格档位");

      const submitData = {
        action: "resize" as const,
        cpu: spec.cpu,
        memory: spec.memory,
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
      Message.success("变配已提交");
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
      title={`变配 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      okText="确认变配"
      onCancel={cancel}
      onOk={async () => mutation.mutate(await form.validate())}
      unmountOnExit
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ spec: currentSpec.value }}
      >
        <Alert
          type="info"
          showIcon
          content="容器变配要求实例处于已停止状态。"
          className="mb-4"
        />
        <Form.Item
          field="spec"
          label="规格档位"
          rules={[{ required: true, message: "请选择规格档位" }]}
        >
          <Select
            placeholder="请选择规格档位"
            options={resizeSpecs.map((option) => ({
              label: `${option.value}${option.value === currentSpec.value ? "（当前）" : ""}`,
              value: option.value,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
