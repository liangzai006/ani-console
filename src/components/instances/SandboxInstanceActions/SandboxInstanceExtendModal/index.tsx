import type { InstanceRecord } from "@/api/instances";
import { applyInstanceLifecycle } from "@/api/instances";
import { Alert, Modal, Select } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { formatDurationSeconds } from "../../SandboxInstanceDetailPage/utils";

type SandboxInstance = InstanceRecord;

export function SandboxInstanceExtendModal({
  instance,
  visible,
  onCancel,
  onSubmitted,
}: {
  instance: SandboxInstance;
  visible: boolean;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [duration, setDuration] = useState("1h");
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "sandbox-lifecycle",
        action: "操作",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async () => {
      const submitData = { action: "extend" as const, duration };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onSubmitted();
    },
  });

  return (
    <Modal
      title={`延长会话 · ${instance.name || instance.id}`}
      visible={visible}
      confirmLoading={mutation.isPending}
      onCancel={onCancel}
      onOk={() => mutation.mutateAsync()}
      unmountOnExit
    >
      <Alert
        className="mb-4"
        type="info"
        content={`当前剩余：${formatDurationSeconds(instance.sandbox?.remain_seconds)}。延长后仍受空闲超时约束。`}
      />
      <div className="mb-2 text-app-text-secondary">延长时长</div>
      <Select
        className="w-full"
        value={duration}
        onChange={setDuration}
        options={[
          { label: "+30 分钟", value: "30m" },
          { label: "+1 小时", value: "1h" },
          { label: "+2 小时", value: "2h" },
        ]}
      />
    </Modal>
  );
}
