import { Message, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { coreApi } from "@/api/client";
import { newIdempotencyKey } from "@/lib/idempotency";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { GpuContainerCreateForm } from "./GpuContainerCreateForm";
import {
  buildCreateRequest,
  type ExtendedCreateRequest,
  type FormValues,
} from "./types";

type Props = { visible: boolean; onCancel: () => void; onCreated: () => void };

export function GpuContainerCreateModal({
  visible,
  onCancel,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    newIdempotencyKey(),
  );
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
      const { error, response } = await request("/instances", {
        body: buildCreateRequest(values, securityGroupId, idempotencyKey),
      });
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
      Message.success("GPU 容器实例创建已提交");
      void queryClient.invalidateQueries({
        queryKey: ["instances", "gpu_container"],
      });
      setIdempotencyKey(newIdempotencyKey());
      onCreated();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "create")),
  });

  const close = () => {
    if (create.isPending) return;
    setIdempotencyKey(newIdempotencyKey());
    onCancel();
  };

  return (
    <Modal
      title="创建 GPU 容器实例"
      visible={visible}
      onCancel={close}
      maskClosable={!create.isPending}
      unmountOnExit
      footer={null}
      style={{ width: 780, height: 680 }}
    >
      <GpuContainerCreateForm
        visible={visible}
        submitting={create.isPending}
        onCancel={close}
        onSubmit={(values, securityGroupId) =>
          create.mutate({ values, securityGroupId })
        }
      />
    </Modal>
  );
}
