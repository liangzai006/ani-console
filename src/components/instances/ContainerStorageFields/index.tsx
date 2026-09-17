import { Form, Input, Select, Switch } from "@arco-design/web-react";
import {
  ContainerFilesystemMountFields,
  type ContainerFilesystemItem,
} from "@/components/instances/ContainerFilesystemMountFields";
import { type ContainerStorageFormValues, hasDuplicateContainerMountPath } from "./storage";

type StorageItem = {
  id: string;
  name?: string | null;
};

export function ContainerStorageFields({
  values,
  volumes,
  filesystems,
}: {
  values: ContainerStorageFormValues;
  volumes?: StorageItem[];
  filesystems?: ContainerFilesystemItem[];
}) {
  const hasDuplicateMountPath = hasDuplicateContainerMountPath(values);

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-4">
        <Form.Item field="volume_id" label="块存储卷">
          <Select allowClear placeholder="不挂载块存储">
            {volumes?.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.name ?? item.id}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          field="volume_mount_path"
          label="挂载路径"
          rules={
            values.volume_id ? [{ required: true, message: "请输入块存储挂载路径" }] : undefined
          }
        >
          <Input disabled={!values.volume_id} placeholder="/data" />
        </Form.Item>
        <Form.Item field="volume_read_only" label="只读挂载" triggerPropName="checked">
          <Switch disabled={!values.volume_id} />
        </Form.Item>
      </div>

      <ContainerFilesystemMountFields
        values={values}
        filesystems={filesystems}
        mountPathError={
          hasDuplicateMountPath ? "块存储卷与文件存储不能使用相同的容器挂载路径" : undefined
        }
      />
    </>
  );
}
