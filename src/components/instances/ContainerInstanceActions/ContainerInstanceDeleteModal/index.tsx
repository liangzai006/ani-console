import { Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];

export function ContainerInstanceDeleteModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const scope = useIdempotencyScope("container-instance-delete", [
    "POST",
    instance.id,
  ]);
  const mutation = useMutation({
    mutationFn: async () => {
      const submitData = { action: "delete" as const };
      const { error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instance.id } },
          body: scope.withKey(submitData),
        },
      );
      if (error) {
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error) }),
          status: response.status,
        };
      }
    },
    onSuccess: () => {
      scope.reset();
      Message.success("删除已提交");
      onSubmitted();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  return (
    <Modal
      title="删除容器实例"
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
      确定删除「{instance.name}」？删除后资源不可恢复。
    </Modal>
  );
}
