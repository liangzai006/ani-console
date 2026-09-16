import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";

type Instance = InstanceRecord;

export function VmInstanceDeleteModal({
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
        successText: "删除已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async () => {
      const submitData = { action: "delete" as const };
      const data = await applyInstanceLifecycle(instance.id, submitData);
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      onSubmitted(operationId);
    },
  });
  return (
    <Modal
      title="删除云主机"
      visible
      confirmLoading={mutation.isPending}
      okButtonProps={{ status: "danger" }}
      onCancel={() => {
        onCancel();
      }}
      onOk={() => mutation.mutate()}
      unmountOnExit
    >
      确定删除「{instance.name}」？删除后资源不可恢复。
    </Modal>
  );
}
