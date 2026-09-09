import { Alert, Form, Message, Modal, Select } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];

function attachedVolumeId(volume: NonNullable<Instance["volumes"]>[number]) {
  const sourceRef = volume.source_ref?.trim();
  if (!sourceRef) return "";
  return sourceRef.startsWith("volume/") ? sourceRef.slice("volume/".length) : sourceRef;
}

export function ContainerInstanceDetachVolumeModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<{ volumeId: string }>();
  const scope = useIdempotencyScope("container-instance-detach-volume", ["POST", instance.id]);
  const mutation = useMutation({
    mutationFn: async ({ volumeId }: { volumeId: string }) => {
      const submitData = {
        action: "detach_volume" as const,
        volume_id: volumeId,
      };
      const { error, response } = await coreApi.POST("/instances/{instance_id}/lifecycle", {
        params: { path: { instance_id: instance.id } },
        body: scope.withKey(submitData),
      });
      if (error)
        throw {
          ...(typeof error === "object" && error ? error : { message: String(error) }),
          status: response.status,
        };
    },
    onSuccess: () => {
      scope.reset();
      Message.success("卸载云盘已提交");
      onSubmitted();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  const options = (instance.volumes ?? []).filter(
    (volume) => volume.kind !== "root_disk" && Boolean(attachedVolumeId(volume)),
  );
  const cancel = () => {
    scope.reset();
    onCancel();
  };

  return (
    <Modal
      title={`卸载云盘 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={cancel}
      onOk={async () => mutation.mutate(await form.validate())}
      unmountOnExit
    >
      <Form form={form} layout="vertical">
        <Alert
          type="warning"
          showIcon
          content="请先确保容器内已停止使用对应挂载点。"
          className="mb-4"
        />
        <Form.Item
          field="volumeId"
          label="云盘"
          rules={[{ required: true, message: "请选择云盘" }]}
        >
          <Select placeholder="请选择要卸载的云盘">
            {options.map((volume) => (
              <Select.Option key={attachedVolumeId(volume)} value={attachedVolumeId(volume)}>
                {volume.name} · {attachedVolumeId(volume)}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
