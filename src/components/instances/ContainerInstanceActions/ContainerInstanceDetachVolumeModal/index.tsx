import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Alert, Form, Modal, Select } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";

import { validateForm } from "@/lib/form";

type Instance = InstanceRecord;

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
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "操作",
        successText: "卸载云盘已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async ({ volumeId }: { volumeId: string }) => {
      const submitData = {
        action: "detach_volume" as const,
        volume_id: volumeId,
      };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onSubmitted();
    },
  });
  const options = (instance.volumes ?? []).filter(
    (volume) => volume.kind !== "root_disk" && Boolean(attachedVolumeId(volume)),
  );
  const cancel = () => {
    onCancel();
  };

  return (
    <Modal
      title={`卸载云盘 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={cancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
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
