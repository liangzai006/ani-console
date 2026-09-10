import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

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
    mutationFn: async () => {
      const submitData = { action: "rebuild" as const };
      const data = await applyInstanceLifecycle(instance.id, submitData);
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      Message.success("重建已提交");
      onSubmitted(operationId);
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
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
