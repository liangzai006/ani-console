import { Message } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { coreApi } from "@/api/client";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { GpuContainerCreateForm } from "./GpuContainerCreateForm";
import { buildCreateRequest, type ExtendedCreateRequest, type FormValues } from "./types";

type Props = { visible: boolean; onCancel: () => void; onCreated: () => void };

export function GpuContainerCreateModal({ visible, onCancel, onCreated }: Props) {
  const queryClient = useQueryClient();
  const createScope = useIdempotencyScope("gpu-container-instance-create", ["POST"]);
  const create = useMutation({
    mutationFn: async ({
      values,
      securityGroupId,
    }: {
      values: FormValues;
      securityGroupId: string;
    }) => {
      const request = coreApi.POST as unknown as (
        path: string,
        options: { body: ExtendedCreateRequest },
      ) => Promise<{ error?: unknown; response: Response }>;
      const submitData = buildCreateRequest(values, securityGroupId);
      const { error, response } = await request("/instances", {
        body: createScope.withKey(submitData) as ExtendedCreateRequest,
      });
      if (error) {
        throw {
          ...(typeof error === "object" && error ? error : { message: String(error) }),
          status: response.status,
        };
      }
    },
    onSuccess: () => {
      createScope.reset();
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
    createScope.reset();
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
