import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { Alert, Form, Message, Modal, Select } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = InstanceRecord;

function attachedVolumeId(volume: NonNullable<Instance["volumes"]>[number]) {
  const sourceRef = volume.source_ref?.trim();
  if (!sourceRef) return "";
  return sourceRef.startsWith("volume/") ? sourceRef.slice("volume/".length) : sourceRef;
}

export function VmInstanceDetachVolumeModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: (operationId: string) => void;
}) {
  const [form] = Form.useForm<{ volumeId: string }>();
  const mutation = useMutation({
    mutationFn: async ({ volumeId }: { volumeId: string }) => {
      const submitData = {
        action: "detach_volume" as const,
        volume_id: volumeId,
      };
      const data = await applyInstanceLifecycle(instance.id, submitData);
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      Message.success("卸载云盘已提交");
      onSubmitted(operationId);
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  const options = (instance.volumes ?? []).filter(
    (volume) => volume.kind !== "root_disk" && Boolean(attachedVolumeId(volume)),
  );
  return (
    <Modal
      title={`卸载云盘 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={() => {
        onCancel();
      }}
      onOk={async () => mutation.mutate(await form.validate())}
      unmountOnExit
    >
      <Form form={form} layout="vertical">
        <Alert
          type="warning"
          showIcon
          content="请先确保操作系统已卸载对应文件系统，系统盘不可卸载。"
          className="mb-4"
        />
        <Form.Item
          field="volumeId"
          label="云盘"
          rules={[{ required: true, message: "请选择云盘" }]}
        >
          <Select placeholder="请选择要卸载的数据盘">
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
