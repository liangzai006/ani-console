import { createSandboxCheckpoint } from "@/api/instances";
import { Form, Input, Modal, Switch } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function SandboxCheckpointCreateModal({
  instanceId,
  onCancel,
  onCreated,
}: {
  instanceId: string;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [keepMemory, setKeepMemory] = useState(false);
  const createCheckpoint = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "sandbox-checkpoint-create",
        action: "检查点创建",
        successText: "检查点已创建",
        errorFallback: "检查点创建失败",
      },
    },
    mutationFn: () =>
      createSandboxCheckpoint(instanceId, {
        name: name.trim(),
        keep_memory: keepMemory,
      }),
    onSuccess: () => {
      onCreated();
      onCancel();
    },
  });

  return (
    <Modal
      visible
      title="创建检查点"
      confirmLoading={createCheckpoint.isPending}
      okButtonProps={{ disabled: !name.trim() }}
      onCancel={onCancel}
      onOk={() => createCheckpoint.mutate()}
    >
      <Form layout="vertical">
        <Form.Item label="检查点名称" required>
          <Input
            value={name}
            onChange={setName}
            placeholder="例如 before-upgrade"
            maxLength={128}
            showWordLimit
          />
        </Form.Item>
        <Form.Item label="保留内存状态">
          <Switch checked={keepMemory} onChange={setKeepMemory} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
