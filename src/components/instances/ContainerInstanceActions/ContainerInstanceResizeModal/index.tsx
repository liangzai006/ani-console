import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Alert, Form, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { InstanceComputeSpecSelect } from "@/components/instances/InstanceComputeSpecSelect";
import { CPU_INSTANCE_COMPUTE_SPECS } from "@/lib/instance-compute-specs";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = InstanceRecord;
type Values = { spec: string };

function getCurrentResizeSpec(instance: Instance) {
  const cpu = String(instance.compute?.cpu ?? "")
    .trim()
    .replace(/C$/i, "");
  const memory = String(instance.compute?.memory ?? "").trim();
  const memoryAmount = memory.match(/^(\d+(?:\.\d+)?)(?:Gi|G)?$/i)?.[1];

  if (!cpu || !memoryAmount) return CPU_INSTANCE_COMPUTE_SPECS[2];

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
  const resizeSpecs = CPU_INSTANCE_COMPUTE_SPECS.some(
    (option) => option.value === currentSpec.value,
  )
    ? [...CPU_INSTANCE_COMPUTE_SPECS]
    : [currentSpec, ...CPU_INSTANCE_COMPUTE_SPECS];
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const spec = resizeSpecs.find((option) => option.value === values.spec);
      if (!spec) throw new Error("请选择有效的规格档位");

      const submitData = {
        action: "resize" as const,
        cpu: spec.cpu,
        memory: spec.memory,
      };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      Message.success("变配已提交");
      onSubmitted();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  const cancel = () => {
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
      <Form form={form} layout="vertical" initialValues={{ spec: currentSpec.value }}>
        <Alert type="info" showIcon content="容器变配要求实例处于已停止状态。" className="mb-4" />
        <InstanceComputeSpecSelect
          field="spec"
          profile="cpu"
          label="规格档位"
          placeholder="请选择规格档位"
          options={resizeSpecs.map((option) => ({
            label: `${option.value}${option.value === currentSpec.value ? "（当前）" : ""}`,
            value: option.value,
          }))}
        />
      </Form>
    </Modal>
  );
}
