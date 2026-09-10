import { listVolumes } from "@/api/storage/volumes";
import { applyInstanceLifecycle } from "@/api/instances";
import type { StorageVolume } from "@/api/storage/volumes";
import type { InstanceRecord } from "@/api/instances";
import { Checkbox, Form, Input, Message, Modal, Select } from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/errors";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = InstanceRecord;
type Values = { volumeId: string; mountPath: string; readOnly?: boolean };

function attachedVolumeId(volume: NonNullable<Instance["volumes"]>[number]) {
  const sourceRef = volume.source_ref?.trim();
  if (!sourceRef) return "";
  return sourceRef.startsWith("volume/") ? sourceRef.slice("volume/".length) : sourceRef;
}

export function VmInstanceAttachVolumeModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: (operationId: string) => void;
}) {
  const [form] = Form.useForm<Values>();
  const volumes = useQuery({
    queryKey: ["volumes", "vm-instance-attach-volume", instance.id],
    queryFn: () =>
      listVolumes({
        limit: 100,
        status: "pending,available",
        available_for_instance_id: instance.id,
      }),
  });
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const submitData = {
        action: "attach_volume" as const,
        volume_id: values.volumeId,
        mount_path: values.mountPath.trim(),
        read_only: values.readOnly ?? false,
      };
      const data = await applyInstanceLifecycle(instance.id, submitData);
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      Message.success("挂载云盘已提交");
      onSubmitted(operationId);
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
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
      onCancel={() => {
        onCancel();
      }}
      onOk={async () => mutation.mutate(await form.validate())}
      unmountOnExit
    >
      <Form form={form} layout="vertical" initialValues={{ readOnly: false }}>
        <Form.Item
          field="volumeId"
          label="云盘"
          extra={volumes.error ? getErrorMessage(volumes.error, "云盘列表加载失败") : undefined}
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
