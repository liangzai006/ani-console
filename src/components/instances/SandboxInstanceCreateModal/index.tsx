import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInstance } from "@/api/instances";

import { SandboxInstanceCreateForm } from "./SandboxInstanceCreateForm";
import { buildCreateRequest, type FormValues, type SandboxTemplate } from "./types";

type Props = {
  visible: boolean;
  onCancel: () => void;
  onCreated: () => void;
};

export function SandboxInstanceCreateModal({ visible, onCancel, onCreated }: Props) {
  const queryClient = useQueryClient();
  const create = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "创建",
        successText: "Sandbox 创建已提交",
        errorFallback: "创建失败，请检查配置后重试",
      },
    },
    mutationFn: async ({ values, template }: { values: FormValues; template: SandboxTemplate }) => {
      const submitData = buildCreateRequest(values, template);
      await createInstance(submitData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sandbox-instances"] });
      onCreated();
    },
  });

  const close = () => {
    if (create.isPending) return;
    onCancel();
  };

  return (
    <SandboxInstanceCreateForm
      visible={visible}
      submitting={create.isPending}
      onCancel={close}
      onSubmit={(values, template) => create.mutate({ values, template })}
    />
  );
}
