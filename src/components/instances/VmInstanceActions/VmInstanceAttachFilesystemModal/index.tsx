import { withId } from "@/lib/id";
import { listFilesystemMountTargets, listFilesystems } from "@/api/storage/filesystems";
import { applyInstanceLifecycle } from "@/api/instances";
import type { StorageFilesystem } from "@/api/storage/filesystems";
import type { InstanceRecord } from "@/api/instances";
import { Alert, Checkbox, Form, Input, Modal, Select } from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { validateForm } from "@/lib/form";

type Instance = InstanceRecord;
type Values = { filesystemId: string; mountPath: string; readOnly?: boolean };

export function VmInstanceAttachFilesystemModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: (operationId: string) => void;
}) {
  const [form] = Form.useForm<Values>();
  const [selectedId, setSelectedId] = useState("");
  const filesystems = useQuery({
    meta: {
      errorNotification: {
        id: "filesystems",
        action: "文件存储列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["filesystems", "vm-instance-attach-filesystem", instance.id],
    queryFn: () =>
      listFilesystems({
        limit: 100,
        protocol: "nfs",
        available_for_instance_id: instance.id,
      }),
  });
  const mountTargets = useQuery({
    meta: {
      errorNotification: {
        id: withId("filesystem-mounts", selectedId),
        action: "NFS 挂载目标检查",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["filesystem-mount-targets", selectedId],
    queryFn: async () => (await listFilesystemMountTargets(selectedId, { limit: 100 })).items,
    enabled: Boolean(selectedId),
  });
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "操作",
        successText: "挂载 NFS 已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async (values: Values) => {
      const submitData = {
        action: "attach_filesystem" as const,
        filesystem_id: values.filesystemId,
        mount_path: values.mountPath.trim(),
        read_only: values.readOnly ?? false,
      };
      const data = await applyInstanceLifecycle(instance.id, submitData);
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      onSubmitted(operationId);
    },
  });
  const attachedIds = new Set(
    (instance.storage_attachments ?? [])
      .filter((item) => item.resource_type === "filesystem")
      .map((item) => item.resource_id),
  );
  const options = ((filesystems.data?.items ?? []) as StorageFilesystem[]).filter(
    (item) => item.protocol === "nfs" && item.state === "available" && !attachedIds.has(item.id),
  );
  const hasMountTarget = Boolean(
    mountTargets.data?.some((target) => target.status === "available"),
  );
  return (
    <Modal
      title={`挂载 NFS · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      okButtonProps={{
        disabled: Boolean(selectedId) && (mountTargets.isLoading || !hasMountTarget),
      }}
      onCancel={() => {
        onCancel();
      }}
      onOk={async () => mutation.mutate(await validateForm(form))}
      unmountOnExit
    >
      <Form form={form} layout="vertical" initialValues={{ readOnly: false }}>
        <Form.Item
          field="filesystemId"
          label="文件存储 NFS"
          rules={[{ required: true, message: "请选择 NFS" }]}
        >
          <Select
            loading={filesystems.isLoading}
            placeholder="请选择可用 NFS"
            showSearch
            onChange={(value) => setSelectedId(value ?? "")}
            onClear={() => setSelectedId("")}
          >
            {options.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.name} · NFS · {item.size_gib} GiB
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {selectedId && !mountTargets.isLoading && !mountTargets.error && !hasMountTarget ? (
          <Alert
            type="warning"
            showIcon
            content="当前 NFS 没有 available 挂载目标，暂不可挂载。"
            className="mb-4"
          />
        ) : null}
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
