import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";

type Instance = InstanceRecord;

export function VmInstanceRebuildModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: (operationId: string) => void;
}) {
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "操作",
        successText: "重建已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async () => {
      const submitData = { action: "rebuild" as const };
      const data = await applyInstanceLifecycle(instance.id, submitData);
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      onSubmitted(operationId);
    },
  });
  return (
    <Modal
      title="重建云主机"
      visible
      confirmLoading={mutation.isPending}
      okButtonProps={{ status: "danger" }}
      onCancel={() => {
        onCancel();
      }}
      onOk={() => mutation.mutate()}
      unmountOnExit
    >
      确定重建「{instance.name}」？实例将重新置备，运行中的计算会中断。
    </Modal>
  );
}
