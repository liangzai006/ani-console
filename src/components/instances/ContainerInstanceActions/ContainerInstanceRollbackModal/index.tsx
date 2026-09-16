import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Alert, Form, Modal, Select, Tooltip } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";

import { getImageDisplayName } from "@/lib/render";
import { validateForm } from "@/lib/form";

type Instance = InstanceRecord;

export function ContainerInstanceRollbackModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<{ revision: string }>();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "操作",
        successText: "回滚发布已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async ({ revision }: { revision: string }) => {
      const submitData = { action: "rollback" as const, revision };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onSubmitted();
    },
  });
  const targets = (instance.container?.history ?? []).filter(
    (entry) => entry.revision !== instance.container?.revision,
  );
  const cancel = () => {
    onCancel();
  };

  return (
    <Modal
      title={`回滚发布 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={cancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
      unmountOnExit
    >
      <Form form={form} layout="vertical">
        <Alert
          type="warning"
          showIcon
          content="回滚发布要求实例处于已停止状态。"
          className="mb-4"
        />
        <Form.Item
          field="revision"
          label="目标修订版本"
          rules={[{ required: true, message: "请选择修订版本" }]}
        >
          <Select placeholder="请选择历史修订版本">
            {targets.map((entry) => (
              <Select.Option key={entry.revision} value={entry.revision}>
                <Tooltip
                  content={entry.image ? `${entry.revision} · ${entry.image}` : entry.revision}
                >
                  <span className="block truncate">
                    {entry.revision}
                    {entry.image ? ` · ${getImageDisplayName(entry.image)}` : ""}
                  </span>
                </Tooltip>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
