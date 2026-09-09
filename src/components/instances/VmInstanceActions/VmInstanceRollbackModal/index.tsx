import { Alert, Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];
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
  const scope = useIdempotencyScope("vm-instance-rollback", ["POST", instance.id]);
  const mutation = useMutation({
    mutationFn: async () => {
      const submitData = {
        action: "rollback" as const,
        snapshot_id: snapshot.id,
      };
      const { data, error, response } = await coreApi.POST("/instances/{instance_id}/lifecycle", {
        params: { path: { instance_id: instance.id } },
        body: scope.withKey(submitData),
      });
      if (error || !data)
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error ?? "操作未返回结果") }),
          status: response.status,
        };
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      scope.reset();
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
        scope.reset();
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
