import { Message, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { coreApi } from "@/api/client";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { SandboxInstanceCreateForm } from "./SandboxInstanceCreateForm";
import {
  buildCreateRequest,
  type FormValues,
  type SandboxTemplate,
} from "./types";

type Props = {
  visible: boolean;
  onCancel: () => void;
  onCreated: () => void;
};

export function SandboxInstanceCreateModal({
  visible,
  onCancel,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();
  const createScope = useIdempotencyScope("sandbox-instance-create", ["POST"]);
  const create = useMutation({
    mutationFn: async ({
      values,
      template,
    }: {
      values: FormValues;
      template: SandboxTemplate;
    }) => {
      const submitData = buildCreateRequest(values, template);
      const { data, error, response } = await coreApi.POST("/instances", {
        body: createScope.withKey(submitData),
      });
      if (error || !data) {
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: "创建失败" }),
          status: response.status,
        };
      }
    },
    onSuccess: () => {
      createScope.reset();
      Message.success("Sandbox 创建已提交");
      void queryClient.invalidateQueries({ queryKey: ["sandbox-instances"] });
      onCreated();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "create")),
  });

  const close = () => {
    if (create.isPending) return;
    createScope.reset();
    onCancel();
  };

  return (
    <Modal
      title="创建 Sandbox"
      visible={visible}
      onCancel={close}
      maskClosable={!create.isPending}
      unmountOnExit
      footer={null}
      style={{ width: 780, height: 680 }}
    >
      <SandboxInstanceCreateForm
        visible={visible}
        submitting={create.isPending}
        onCancel={close}
        onSubmit={(values, template) => create.mutate({ values, template })}
      />
    </Modal>
  );
}
