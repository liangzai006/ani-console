import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Button, Form, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";

import { InstanceRegistryImageSelect } from "@/components/instances/InstanceRegistryImageSelect";
import { validateForm } from "@/lib/form";

type Instance = InstanceRecord;
type Values = { image_id?: string };

export function InstanceReleaseActions({
  instance,
  onChanged,
}: {
  instance: Instance;
  onChanged: () => void;
}) {
  const [form] = Form.useForm<Values>();
  const busy = ["pending", "provisioning", "starting", "stopping", "deleting"].includes(
    instance.state,
  );
  const updateImage = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "instance-image-update",
        action: "操作",
        successText: "镜像更新已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async (values: Values) => {
      const submitData = {
        action: "update_image" as const,
        image_id: values.image_id,
        strategy: "rolling" as const,
      };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onChanged();
    },
  });
  return (
    <Button
      disabled={busy}
      onClick={() =>
        Modal.confirm({
          title: `更新镜像 · ${instance.name}`,
          content: (
            <Form form={form} layout="vertical">
              <InstanceRegistryImageSelect
                field="image_id"
                enabled
                instanceKind={instance.kind === "gpu_container" ? "gpu_container" : "container"}
              />
            </Form>
          ),
          confirmLoading: updateImage.isPending,
          onOk: async () => updateImage.mutateAsync(await validateForm(form)),
        })
      }
    >
      更新镜像
    </Button>
  );
}
