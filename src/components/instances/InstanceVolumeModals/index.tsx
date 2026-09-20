import { applyInstanceLifecycle, type InstanceRecord } from "@/api/instances";
import { listVolumes, type StorageVolume } from "@/api/storage/volumes";
import { validateForm } from "@/lib/form";
import { withId } from "@/lib/id";
import { Checkbox, Form, Input, Modal, Select } from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";

type ModalProps = {
  instance: InstanceRecord;
  onCancel: () => void;
  onSubmitted: (operationId: string) => void;
};

type AttachValues = {
  volumeId: string;
  mountPath: string;
  readOnly?: boolean;
};

function attachedVolumeId(volume: NonNullable<InstanceRecord["volumes"]>[number]) {
  const sourceRef = volume.source_ref?.trim();
  if (!sourceRef) return "";
  return sourceRef.startsWith("volume/") ? sourceRef.slice("volume/".length) : sourceRef;
}

export function InstanceAttachVolumeModal({ instance, onCancel, onSubmitted }: ModalProps) {
  const [form] = Form.useForm<AttachValues>();
  const volumes = useQuery({
    meta: {
      errorNotification: {
        id: "volumes",
        action: "云盘列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["volumes", withId("instance-attach", instance.kind, instance.id)],
    queryFn: () =>
      listVolumes({
        limit: 100,
        state: "pending,available",
        available_for_instance_id: instance.id,
      }),
  });
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "挂载云盘",
        successText: "挂载云盘已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async (values: AttachValues) => {
      const data = await applyInstanceLifecycle(instance.id, {
        action: "attach_volume",
        volume_id: values.volumeId,
        mount_path: values.mountPath.trim(),
        read_only: values.readOnly ?? false,
      });
      return data.operation_id;
    },
    onSuccess: onSubmitted,
  });
  const attachedIds = new Set((instance.volumes ?? []).map(attachedVolumeId).filter(Boolean));
  const options = ((volumes.data?.items ?? []) as StorageVolume[]).filter(
    (volume) =>
      ["pending", "available"].includes(volume.state) &&
      !volume.mount_instance_id &&
      !attachedIds.has(volume.id),
  );

  return (
    <Modal
      title={`挂载云盘 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
      unmountOnExit
    >
      <Form form={form} layout="vertical" initialValues={{ readOnly: false }}>
        <Form.Item
          field="volumeId"
          label="云盘"
          rules={[{ required: true, message: "请选择云盘" }]}
        >
          <Select loading={volumes.isLoading} placeholder="请选择可挂载云盘" showSearch>
            {options.map((volume) => (
              <Select.Option key={volume.id} value={volume.id}>
                {volume.name} · {volume.size_gib} GiB · {volume.storage_class}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          field="mountPath"
          label="挂载路径"
          rules={[{ required: true, message: "请输入挂载路径" }]}
        >
          <Input placeholder="例如 /data" />
        </Form.Item>
        <Form.Item field="readOnly" triggerPropName="checked">
          <Checkbox>只读挂载</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function InstanceDetachVolumeModal({ instance, onCancel, onSubmitted }: ModalProps) {
  const [form] = Form.useForm<{ volumeId: string }>();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "卸载云盘",
        successText: "卸载云盘已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async ({ volumeId }: { volumeId: string }) => {
      const data = await applyInstanceLifecycle(instance.id, {
        action: "detach_volume",
        volume_id: volumeId,
      });
      return data.operation_id;
    },
    onSuccess: onSubmitted,
  });
  const options = (instance.volumes ?? []).filter(
    (volume) => volume.kind !== "root_disk" && Boolean(attachedVolumeId(volume)),
  );

  return (
    <Modal
      title={`卸载云盘 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
      unmountOnExit
    >
      <Form form={form} layout="vertical">
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
