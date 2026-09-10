import { Message } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInstance } from "@/api/instances";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { GpuContainerCreateForm } from "./GpuContainerCreateForm";
import { buildCreateRequest, type FormValues } from "./types";

type Props = { visible: boolean; onCancel: () => void; onCreated: () => void };

export function GpuContainerCreateModal({ visible, onCancel, onCreated }: Props) {
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: async ({
      values,
      securityGroupId,
    }: {
      values: FormValues;
      securityGroupId: string;
    }) => {
      const submitData = buildCreateRequest(values, securityGroupId);
      await createInstance(submitData);
    },
    onSuccess: () => {
      Message.success("GPU 容器实例创建已提交");
      void queryClient.invalidateQueries({
        queryKey: ["instances", "gpu_container"],
      });
      onCreated();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "create")),
  });

  const close = () => {
    if (create.isPending) return;
    onCancel();
  };

  return (
    <GpuContainerCreateForm
      visible={visible}
      submitting={create.isPending}
      onCancel={close}
      onSubmit={(values, securityGroupId) => create.mutate({ values, securityGroupId })}
    />
  );
}
