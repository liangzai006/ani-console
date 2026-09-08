import {
  Alert,
  Checkbox,
  Form,
  Input,
  Message,
  Modal,
  Select,
} from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { listOrThrow } from "@/lib/api-list";
import { getErrorMessage } from "@/lib/errors";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];
type StorageFilesystem = components["schemas"]["StorageFilesystem"];
type FilesystemMountTarget = components["schemas"]["FilesystemMountTarget"];
type Values = { filesystemId: string; mountPath: string; readOnly?: boolean };

export function ContainerInstanceAttachFilesystemModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<Values>();
  const [selectedId, setSelectedId] = useState("");
  const scope = useIdempotencyScope("container-instance-attach-filesystem", [
    "POST",
    instance.id,
  ]);
  const filesystems = useQuery({
    queryKey: [
      "filesystems",
      "container-instance-attach-filesystem",
      instance.id,
    ],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/filesystems", {
          params: {
            query: asUncontractedQuery({
              limit: 100,
              protocol: "nfs",
              available_for_instance_id: instance.id,
            }),
          },
        }),
      ),
  });
  const mountTargets = useQuery({
    queryKey: ["filesystem-mount-targets", selectedId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET(
        "/filesystems/{filesystem_id}/mount-targets",
        {
          params: {
            path: { filesystem_id: selectedId },
            query: { limit: 100 },
          },
        },
      );
      if (error || !data)
        throw error ?? new Error("文件系统挂载目标未返回结果");
      return data.items as FilesystemMountTarget[];
    },
    enabled: Boolean(selectedId),
  });
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const submitData = {
        action: "attach_filesystem" as const,
        filesystem_id: values.filesystemId,
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
      Message.success("挂载 NFS 已提交");
      onSubmitted();
    },
    onError: (error) =>
      Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  const attachedIds = new Set(
    (instance.storage_attachments ?? [])
      .filter((item) => item.resource_type === "filesystem")
      .map((item) => item.resource_id),
  );
  const options = (
    (filesystems.data?.items ?? []) as StorageFilesystem[]
  ).filter(
    (item) =>
      item.protocol === "nfs" &&
      item.state === "available" &&
      !attachedIds.has(item.id),
  );
  const hasMountTarget = Boolean(
    mountTargets.data?.some((target) => target.status === "available"),
  );
  const cancel = () => {
    scope.reset();
    onCancel();
  };

  return (
    <Modal
      title={`挂载 NFS · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      okButtonProps={{
        disabled:
          Boolean(selectedId) && (mountTargets.isLoading || !hasMountTarget),
      }}
      onCancel={cancel}
      onOk={async () => mutation.mutate(await form.validate())}
      unmountOnExit
    >
      <Form form={form} layout="vertical" initialValues={{ readOnly: false }}>
        <Form.Item
          field="filesystemId"
          label="文件存储 NFS"
          extra={
            filesystems.error
              ? getErrorMessage(filesystems.error, "文件存储列表加载失败")
              : undefined
          }
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
        {selectedId && mountTargets.error ? (
          <Alert
            type="error"
            showIcon
            content={getErrorMessage(
              mountTargets.error,
              "NFS 挂载目标检查失败",
            )}
            className="mb-4"
          />
        ) : null}
        {selectedId &&
        !mountTargets.isLoading &&
        !mountTargets.error &&
        !hasMountTarget ? (
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
