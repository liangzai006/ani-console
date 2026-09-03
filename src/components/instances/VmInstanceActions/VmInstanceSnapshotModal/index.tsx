import { Checkbox, Form, Input, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];
type Values = { snapshotName: string; includeDataDisks?: boolean };

export function VmInstanceSnapshotModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: (operationId: string) => void;
}) {
  const [form] = Form.useForm<Values>();
  const scope = useIdempotencyScope("vm-instance-snapshot", [
    "POST",
    instance.id,
  ]);
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const submitData = {
        action: "snapshot" as const,
        snapshot_name: values.snapshotName.trim(),
        include_data_disks: values.includeDataDisks ?? false,
      };
      const { data, error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instance.id } },
          body: scope.withKey(submitData),
        },
      );
      if (error || !data)
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error ?? "操作未返回结果") }),
          status: response.status,
        };
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      scope.reset();
      Message.success("创建快照已提交");
      onSubmitted(operationId);
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  return (
    <Modal
      title={`创建快照 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={() => {
        scope.reset();
        onCancel();
      }}
      onOk={async () => mutation.mutate(await form.validate())}
      unmountOnExit
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ includeDataDisks: true }}
      >
        <Form.Item
          field="snapshotName"
          label="快照名称"
          rules={[{ required: true, message: "请输入快照名称" }]}
        >
          <Input placeholder="请输入快照名称" />
        </Form.Item>
        <Form.Item field="includeDataDisks" triggerPropName="checked">
          <Checkbox>包含数据盘</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
