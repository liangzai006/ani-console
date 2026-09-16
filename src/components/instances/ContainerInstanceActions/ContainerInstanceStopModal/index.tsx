import type { InstanceRecord } from "@/api/instances";
import { applyInstanceLifecycle } from "@/api/instances";
import { Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";

type Instance = InstanceRecord;

export function ContainerInstanceStopModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "操作",
        successText: "停止已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async () => {
      const submitData = { action: "stop" as const };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onSubmitted();
    },
  });

  return (
    <Modal
      title="停止容器实例"
      visible
      confirmLoading={mutation.isPending}
      onCancel={() => {
        onCancel();
      }}
      onOk={() => mutation.mutate()}
      unmountOnExit
    >
      确定停止「{instance.name}」？
    </Modal>
  );
}
