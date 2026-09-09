import {
  Alert,
  Checkbox,
  Empty,
  Form,
  Input,
  Message,
  Modal,
  Select,
  Space,
} from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { DataTable, StatusTag, TableSectionHeader } from "@/components/common";
import { listOrThrow } from "@/lib/api-list";
import { getErrorMessage } from "@/lib/errors";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

type Instance = components["schemas"]["InstanceRecord"];
type LifecycleRequest = components["schemas"]["InstanceLifecycleRequest"];
type Volume = NonNullable<Instance["volumes"]>[number];
type FilesystemAttachment = NonNullable<Instance["storage_attachments"]>[number];
type StorageVolume = components["schemas"]["StorageVolume"];
type StorageFilesystem = components["schemas"]["StorageFilesystem"];
type FilesystemMountTarget = components["schemas"]["FilesystemMountTarget"];
export type MountKind = "volume" | "filesystem";

type MountFormValues = {
  resourceId?: string;
  mountPath?: string;
  readOnly?: boolean;
};

export function InstanceStorage({
  instance,
  mountKind,
  onMountKindChange,
  onChanged,
  volumeAction,
  filesystemAction,
}: {
  instance: Instance;
  mountKind?: MountKind;
  onMountKindChange: (kind?: MountKind) => void;
  onChanged: () => void;
  volumeAction?: ReactNode;
  filesystemAction?: ReactNode;
}) {
  const [form] = Form.useForm<MountFormValues>();
  const mountScope = useIdempotencyScope("instance-storage-mount", ["POST", instance.id]);
  const [selectedResourceId, setSelectedResourceId] = useState("");
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
    queryKey: ["volumes", "instance-mount", instance.id],
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
    enabled: mountKind === "volume",
  });
  const filesystemOptions = useQuery({
    queryKey: ["filesystems", "instance-mount", instance.id],
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
    enabled: mountKind === "filesystem",
  });
  const mountTargets = useQuery({
    queryKey: ["filesystem-mount-targets", selectedResourceId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET("/filesystems/{filesystem_id}/mount-targets", {
        params: {
          path: { filesystem_id: selectedResourceId },
          query: { limit: 100 },
        },
      });
      if (error || !data) {
        throw error ?? new Error("文件系统挂载目标未返回结果");
      }
      return data.items as FilesystemMountTarget[];
    },
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
      };
      const { error, response } = await coreApi.POST("/instances/{instance_id}/lifecycle", {
        params: { path: { instance_id: instance.id } },
        body: mountScope.withKey(submitData) as LifecycleRequest,
      });
      if (error) {
        throw {
          ...(typeof error === "object" && error ? error : { message: String(error) }),
          status: response.status,
        };
      }
    },
    onSuccess: () => {
      mountScope.reset();
      Message.success(mountKind === "volume" ? "云盘挂载已提交" : "NFS 挂载已提交");
      onMountKindChange(undefined);
      setSelectedResourceId("");
      form.resetFields();
      onChanged();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });

  return (
    <>
      <Space direction="vertical" size={24} className="w-full">
        <section>
          <TableSectionHeader title="挂载点" extra={volumeAction} />
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
          <TableSectionHeader title="文件存储 NFS" extra={filesystemAction} />
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
          mountScope.reset();
          onMountKindChange(undefined);
          setSelectedResourceId("");
          form.resetFields();
        }}
        onOk={async () => mount.mutate(await form.validate())}
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
          {mountKind === "volume" && volumeOptions.error ? (
            <Alert
              className="mb-4"
              type="error"
              showIcon
              content={getErrorMessage(volumeOptions.error, "云盘列表加载失败")}
            />
          ) : null}
          {mountKind === "filesystem" && filesystemOptions.error ? (
            <Alert
              className="mb-4"
              type="error"
              showIcon
              content={getErrorMessage(filesystemOptions.error, "文件存储列表加载失败")}
            />
          ) : null}
          {mountKind === "filesystem" && selectedResourceId && mountTargets.error ? (
            <Alert
              className="mb-4"
              type="error"
              showIcon
              content={getErrorMessage(mountTargets.error, "NFS 挂载目标检查失败")}
            />
          ) : null}
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
