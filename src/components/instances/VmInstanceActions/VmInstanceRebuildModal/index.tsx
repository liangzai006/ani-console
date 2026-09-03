import { Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];

export function VmInstanceRebuildModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: (operationId: string) => void;
}) {
  const scope = useIdempotencyScope("vm-instance-rebuild", [
    "POST",
    instance.id,
  ]);
  const mutation = useMutation({
    mutationFn: async () => {
      const submitData = { action: "rebuild" as const };
      const { data, error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instance.id } },
          body: scope.withKey(submitData),
        },
      );
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
      Message.success("重建已提交");
      onSubmitted(operationId);
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  return (
    <Modal
      title="重建云主机"
      visible
      confirmLoading={mutation.isPending}
      okButtonProps={{ status: "danger" }}
      onCancel={() => {
        scope.reset();
        onCancel();
      }}
      onOk={() => mutation.mutate()}
      unmountOnExit
    >
      确定重建「{instance.name}」？实例将重新置备，运行中的计算会中断。
    </Modal>
  );
}
