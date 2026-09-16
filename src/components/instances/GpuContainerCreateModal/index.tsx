import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInstance } from "@/api/instances";

import { GpuContainerCreateForm } from "./GpuContainerCreateForm";
import { buildCreateRequest, type FormValues } from "./types";

type Props = { visible: boolean; onCancel: () => void; onCreated: () => void };

export function GpuContainerCreateModal({ visible, onCancel, onCreated }: Props) {
  const queryClient = useQueryClient();
  const create = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "创建",
        successText: "GPU 容器实例创建已提交",
        errorFallback: "创建失败，请检查配置后重试",
      },
    },
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
      void queryClient.invalidateQueries({
        queryKey: ["instances", "gpu_container"],
      });
      onCreated();
    },
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
