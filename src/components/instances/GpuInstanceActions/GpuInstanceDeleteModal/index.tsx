import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";

type Instance = InstanceRecord;

export function GpuInstanceDeleteModal({
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
        successText: "删除已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async () => {
      const submitData = { action: "delete" as const };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onSubmitted();
    },
  });
  return (
    <Modal
      title="删除 GPU 容器实例"
      visible
      confirmLoading={mutation.isPending}
      okButtonProps={{ status: "danger" }}
      onCancel={() => {
        onCancel();
      }}
      onOk={() => mutation.mutate()}
      unmountOnExit
    >
      确定删除「{instance.name}」？删除后无法恢复。
    </Modal>
  );
}
