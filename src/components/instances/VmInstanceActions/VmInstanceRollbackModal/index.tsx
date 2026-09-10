import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Alert, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = InstanceRecord;
type Snapshot = NonNullable<Instance["snapshots"]>[number];

export function VmInstanceRollbackModal({
  instance,
  snapshot,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  snapshot: Snapshot;
  onCancel: () => void;
  onSubmitted: (operationId: string) => void;
}) {
  const mutation = useMutation({
    mutationFn: async () => {
      const submitData = {
        action: "rollback" as const,
        snapshot_id: snapshot.id,
      };
      const data = await applyInstanceLifecycle(instance.id, submitData);
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      Message.success("回滚快照已提交");
      onSubmitted(operationId);
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  return (
    <Modal
      title={`回滚快照 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={() => {
        onCancel();
      }}
      onOk={() => mutation.mutateAsync()}
      unmountOnExit
    >
      <Alert
        type="warning"
        showIcon
        content={`确定使用快照“${snapshot.name} · ${snapshot.id}”恢复云主机吗？回滚后实例将切换为运行状态。`}
      />
    </Modal>
  );
}
