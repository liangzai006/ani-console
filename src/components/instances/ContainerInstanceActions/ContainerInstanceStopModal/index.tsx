import type { InstanceRecord } from "@/api/instances";
import { applyInstanceLifecycle } from "@/api/instances";
import { Message, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

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
    mutationFn: async () => {
      const submitData = { action: "stop" as const };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      Message.success("停止已提交");
      onSubmitted();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
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
