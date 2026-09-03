import {
  Checkbox,
  Form,
  Input,
  Message,
  Modal,
  Select,
} from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { listOrThrow } from "@/lib/api-list";
import { getErrorMessage } from "@/lib/errors";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];
type StorageVolume = components["schemas"]["StorageVolume"];
type Values = { volumeId: string; mountPath: string; readOnly?: boolean };

function attachedVolumeId(volume: NonNullable<Instance["volumes"]>[number]) {
  const sourceRef = volume.source_ref?.trim();
  if (!sourceRef) return "";
  return sourceRef.startsWith("volume/")
    ? sourceRef.slice("volume/".length)
    : sourceRef;
}

export function ContainerInstanceAttachVolumeModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<Values>();
  const scope = useIdempotencyScope("container-instance-attach-volume", [
    "POST",
    instance.id,
  ]);
  const volumes = useQuery({
    queryKey: ["volumes", "container-instance-attach-volume", instance.id],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/volumes", {
          params: {
            query: asUncontractedQuery({
              limit: 100,
              status: "pending,available",
              available_for_instance_id: instance.id,
            }),
          },
        }),
      ),
  });
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const submitData = {
        action: "attach_volume" as const,
        volume_id: values.volumeId,
        mount_path: values.mountPath.trim(),
        read_only: values.readOnly ?? false,
      };
      const { error, response } = await coreApi.POST(
        "/instances/{instance_id}/lifecycle",
        {
          params: { path: { instance_id: instance.id } },
          body: scope.withKey(submitData),
        },
      );
      if (error)
        throw {
          ...(typeof error === "object" && error
            ? error
            : { message: String(error) }),
          status: response.status,
        };
    },
    onSuccess: () => {
      scope.reset();
      Message.success("挂载云盘已提交");
      onSubmitted();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  const attachedIds = new Set(
    (instance.volumes ?? []).map(attachedVolumeId).filter(Boolean),
  );
  const options = ((volumes.data?.items ?? []) as StorageVolume[]).filter(
    (volume) =>
      ["pending", "available"].includes(volume.state) &&
      !volume.mount_instance_id &&
      !attachedIds.has(volume.id),
  );
  const cancel = () => {
    scope.reset();
    onCancel();
  };

  return (
    <Modal
      title={`挂载云盘 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={cancel}
      onOk={async () => mutation.mutate(await form.validate())}
      unmountOnExit
    >
      <Form form={form} layout="vertical" initialValues={{ readOnly: false }}>
        <Form.Item
          field="volumeId"
          label="云盘"
          extra={
            volumes.error
              ? getErrorMessage(volumes.error, "云盘列表加载失败")
              : undefined
          }
          rules={[{ required: true, message: "请选择云盘" }]}
        >
          <Select
            loading={volumes.isLoading}
            placeholder="请选择可挂载云盘"
            showSearch
          >
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
