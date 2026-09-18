import { withId } from "@/lib/id";
import { listVolumes } from "@/api/storage/volumes";
import { listFilesystemMountTargets, listFilesystems } from "@/api/storage/filesystems";
import type { StorageFilesystem } from "@/api/storage/filesystems";
import type { StorageVolume } from "@/api/storage/volumes";
import type { InstanceRecord } from "@/api/instances";
import { applyInstanceLifecycle } from "@/api/instances";
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
} from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DataTable, StatusTag, TableSectionHeader } from "@/components/common";

import { validateForm } from "@/lib/form";

type Instance = InstanceRecord;
type Volume = NonNullable<Instance["volumes"]>[number];
type FilesystemAttachment = NonNullable<Instance["storage_attachments"]>[number];
type MountKind = "volume" | "filesystem";

const MOUNT_BUSY_STATES = new Set<Instance["state"]>([
  "pending",
  "provisioning",
  "starting",
  "stopping",
  "deleting",
]);

function isMountDisabled(instance: Instance) {
  if (instance.kind === "vm") {
    return instance.state !== "running" && instance.state !== "stopped";
  }
  return MOUNT_BUSY_STATES.has(instance.state);
}

type MountFormValues = {
  resourceId?: string;
  mountPath?: string;
  readOnly?: boolean;
};

export function InstanceStorage({
  instance,
  onChanged,
}: {
  instance: Instance;
  onChanged: () => void;
}) {
  const [form] = Form.useForm<MountFormValues>();
  const [mountKind, setMountKind] = useState<MountKind>();
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const mountDisabled = isMountDisabled(instance);
  const volumes = instance.volumes ?? [];
  const filesystems = (instance.storage_attachments ?? []).filter(
    (attachment) => attachment.resource_type === "filesystem",
  );
  const attachedVolumeIds = new Set(
    (instance.resource_refs ?? [])
      .filter((reference) => reference.startsWith("volume/"))
      .map((reference) => reference.slice("volume/".length)),
  );
  const attachedFilesystemIds = new Set(filesystems.map((filesystem) => filesystem.resource_id));
  const volumeOptions = useQuery({
    meta: {
      errorNotification: {
        id: "volumes",
        action: "云盘列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["volumes", "instance-mount", instance.id],
    queryFn: () =>
      listVolumes({
        limit: 100,
        status: "pending,available",
        available_for_instance_id: instance.id,
      }),
    enabled: mountKind === "volume",
  });
  const filesystemOptions = useQuery({
    meta: {
      errorNotification: {
        id: "filesystems",
        action: "文件存储列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["filesystems", "instance-mount", instance.id],
    queryFn: () =>
      listFilesystems({
        limit: 100,
        protocol: "nfs",
        available_for_instance_id: instance.id,
      }),
    enabled: mountKind === "filesystem",
  });
  const mountTargets = useQuery({
    meta: {
      errorNotification: {
        id: withId("filesystem-mounts", selectedResourceId),
        action: "NFS 挂载目标检查",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["filesystem-mount-targets", selectedResourceId],
    queryFn: async () =>
      (await listFilesystemMountTargets(selectedResourceId, { limit: 100 })).items,
    enabled: mountKind === "filesystem" && Boolean(selectedResourceId),
  });
  // TODO: 存储接口确认按状态和 available_for_instance_id 过滤后，移除此处关联资源选择的本地兜底过滤。
  const availableVolumes = ((volumeOptions.data?.items ?? []) as StorageVolume[]).filter(
    (volume) =>
      ["pending", "available"].includes(volume.state) &&
      !volume.mount_instance_id &&
      !attachedVolumeIds.has(volume.id),
  );
  const availableFilesystems = (
    (filesystemOptions.data?.items ?? []) as StorageFilesystem[]
  ).filter(
    (filesystem) =>
      filesystem.protocol === "nfs" &&
      filesystem.state === "available" &&
      !attachedFilesystemIds.has(filesystem.id),
  );
  const hasAvailableMountTarget = Boolean(
    mountTargets.data?.some((target) => target.status === "available"),
  );

  useEffect(() => {
    if (!mountKind) return;
    form.resetFields();
    form.setFieldsValue({ readOnly: false });
    setSelectedResourceId("");
  }, [form, mountKind]);

  const mount = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "instance-storage-mount",
        action: "操作",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async (values: MountFormValues) => {
      const resourceId = values.resourceId?.trim();
      const mountPath = values.mountPath?.trim();
      if (!mountKind || !resourceId || !mountPath) return;
      if (mountKind === "filesystem" && !hasAvailableMountTarget) {
        throw new Error("当前 NFS 没有可用挂载目标");
      }
      const submitData = {
        action: mountKind === "volume" ? "attach_volume" : "attach_filesystem",
        mount_path: mountPath,
        read_only: values.readOnly ?? false,
        ...(mountKind === "volume" ? { volume_id: resourceId } : { filesystem_id: resourceId }),
      } as const;
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      setMountKind(undefined);
      setSelectedResourceId("");
      form.resetFields();
      onChanged();
    },
  });

  return (
    <>
      <Space direction="vertical" size={24} className="w-full">
        <section>
          <TableSectionHeader
            title="挂载点"
            extra={
              <Button disabled={mountDisabled} onClick={() => setMountKind("volume")}>
                挂载云盘
              </Button>
            }
          />
          <DataTable<Volume>
            data={volumes}
            rowKey={(volume) =>
              `${volume.kind}:${volume.source_ref ?? volume.name}:${volume.mount_path ?? ""}`
            }
            pagination={false}
            noDataElement={<Empty description="暂无挂载点" />}
            columns={[
              { title: "名称", dataIndex: "name" },
              { title: "类型", dataIndex: "kind", width: 150 },
              {
                title: "挂载路径",
                dataIndex: "mount_path",
                placeholder: "-",
              },
              {
                title: "访问模式",
                width: 100,
                render: (_, volume) => (volume.read_only ? "只读" : "读写"),
              },
            ]}
          />
        </section>

        <section>
          <TableSectionHeader
            title="文件存储 NFS"
            extra={
              <Button disabled={mountDisabled} onClick={() => setMountKind("filesystem")}>
                挂载 NFS
              </Button>
            }
          />
          <DataTable<FilesystemAttachment>
            data={filesystems}
            rowKey={(filesystem) => `${filesystem.resource_id}:${filesystem.mount_path ?? ""}`}
            pagination={false}
            noDataElement={<Empty description="暂无文件存储 NFS" />}
            columns={[
              {
                title: "文件存储",
                render: (_, filesystem) => filesystem.resource_name ?? filesystem.resource_id,
              },
              { title: "文件系统 ID", dataIndex: "resource_id" },
              {
                title: "挂载路径",
                dataIndex: "mount_path",
                placeholder: "-",
              },
              {
                title: "访问模式",
                width: 100,
                render: (_, filesystem) => (filesystem.read_only ? "只读" : "读写"),
              },
              {
                title: "状态",
                width: 120,
                render: (_, filesystem) =>
                  filesystem.status ? <StatusTag status={filesystem.status} /> : "-",
              },
            ]}
          />
        </section>
      </Space>

      <Modal
        title={mountKind === "volume" ? "挂载云盘" : "挂载 NFS"}
        visible={Boolean(mountKind)}
        confirmLoading={mount.isPending}
        okButtonProps={{
          disabled:
            !selectedResourceId ||
            (mountKind === "filesystem" && (mountTargets.isLoading || !hasAvailableMountTarget)),
        }}
        onCancel={() => {
          setMountKind(undefined);
          setSelectedResourceId("");
          form.resetFields();
        }}
        onOk={async () => mount.mutate(await validateForm(form))}
        unmountOnExit
      >
        <Form form={form} layout="vertical">
          <Form.Item
            field="resourceId"
            label={mountKind === "volume" ? "云盘" : "文件存储 NFS"}
            rules={[{ required: true, message: "请选择资源" }]}
          >
            <Select
              loading={
                mountKind === "volume" ? volumeOptions.isLoading : filesystemOptions.isLoading
              }
              placeholder={mountKind === "volume" ? "请选择可挂载云盘" : "请选择可用 NFS"}
              showSearch
              allowClear
              onChange={(value) => setSelectedResourceId(value ?? "")}
              onClear={() => setSelectedResourceId("")}
              filterOption={(inputValue, option) =>
                String(option.props.children).toLowerCase().includes(inputValue.toLowerCase())
              }
            >
              {mountKind === "volume"
                ? availableVolumes.map((volume) => (
                    <Select.Option key={volume.id} value={volume.id}>
                      {volume.name} · {volume.size_gib} GiB · {volume.storage_class}
                    </Select.Option>
                  ))
                : availableFilesystems.map((filesystem) => (
                    <Select.Option key={filesystem.id} value={filesystem.id}>
                      {filesystem.name} · NFS · {filesystem.size_gib} GiB
                    </Select.Option>
                  ))}
            </Select>
          </Form.Item>
          {mountKind === "filesystem" &&
          selectedResourceId &&
          !mountTargets.isLoading &&
          !mountTargets.error &&
          !hasAvailableMountTarget ? (
            <Alert
              className="mb-4"
              type="warning"
              showIcon
              content="当前 NFS 没有 available 挂载目标，暂不可挂载"
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
    </>
  );
}
