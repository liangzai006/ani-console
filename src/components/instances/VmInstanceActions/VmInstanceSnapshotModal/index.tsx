import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Checkbox, Form, Input, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = InstanceRecord;
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
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const submitData = {
        action: "snapshot" as const,
        snapshot_name: values.snapshotName.trim(),
        include_data_disks: values.includeDataDisks ?? false,
      };
      const data = await applyInstanceLifecycle(instance.id, submitData);
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      Message.success("创建快照已提交");
      onSubmitted(operationId);
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  return (
    <Modal
      title={`创建快照 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={() => {
        onCancel();
      }}
      onOk={async () => mutation.mutate(await form.validate())}
      unmountOnExit
    >
      <Form form={form} layout="vertical" initialValues={{ includeDataDisks: true }}>
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
