import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Checkbox, Form, Input, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";

import { validateForm } from "@/lib/form";

type Instance = InstanceRecord;
type Values = { filesystemId: string; mountPath: string; readOnly?: boolean };

export function GpuInstanceAttachFilesystemModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<Values>();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "操作",
        successText: "挂载 NFS 已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async (values: Values) => {
      const submitData = {
        action: "attach_filesystem" as const,
        filesystem_id: values.filesystemId.trim(),
        mount_path: values.mountPath.trim(),
        read_only: values.readOnly ?? false,
      };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onSubmitted();
    },
  });
  return (
    <Modal
      title={`挂载 NFS · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={() => {
        onCancel();
      }}
      onOk={async () => mutation.mutate(await validateForm(form))}
      unmountOnExit
    >
      <Form form={form} layout="vertical" initialValues={{ readOnly: false }}>
        <Form.Item
          field="filesystemId"
          label="NFS 文件系统 ID"
          rules={[{ required: true, message: "请输入文件系统 ID" }]}
        >
          <Input placeholder="请输入文件系统 ID" />
        </Form.Item>
        <Form.Item
          field="mountPath"
          label="挂载路径"
          rules={[{ required: true, message: "请输入挂载路径" }]}
        >
          <Input placeholder="例如 /data" />
        </Form.Item>
        <Form.Item field="readOnly" triggerPropName="checked">
          <Checkbox>只读挂载</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
