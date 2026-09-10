import { Message } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInstance } from "@/api/instances";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
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
    mutationFn: async ({ values, template }: { values: FormValues; template: SandboxTemplate }) => {
      const submitData = buildCreateRequest(values, template);
      await createInstance(submitData);
    },
    onSuccess: () => {
      Message.success("Sandbox 创建已提交");
      void queryClient.invalidateQueries({ queryKey: ["sandbox-instances"] });
      onCreated();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "create")),
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
