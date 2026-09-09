import { Form, Input, Select, Switch } from "@arco-design/web-react";
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
  filesystems?: StorageItem[];
}) {
  const hasDuplicateMountPath = hasDuplicateContainerMountPath(values);

  return (
    <>
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
        label="块存储挂载路径"
        rules={values.volume_id ? [{ required: true, message: "请输入块存储挂载路径" }] : undefined}
      >
        <Input disabled={!values.volume_id} placeholder="/data" />
      </Form.Item>
      <Form.Item field="volume_read_only" label="块存储只读挂载" triggerPropName="checked">
        <Switch disabled={!values.volume_id} />
      </Form.Item>

      <Form.Item field="filesystem_id" label="文件存储">
        <Select allowClear placeholder="不挂载文件存储">
          {filesystems?.map((item) => (
            <Select.Option key={item.id} value={item.id}>
              {item.name ?? item.id}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        field="filesystem_mount_path"
        label="文件存储挂载路径"
        rules={
          values.filesystem_id ? [{ required: true, message: "请输入文件存储挂载路径" }] : undefined
        }
        validateStatus={hasDuplicateMountPath ? "error" : undefined}
        help={hasDuplicateMountPath ? "块存储卷与文件存储不能使用相同的容器挂载路径" : undefined}
      >
        <Input disabled={!values.filesystem_id} placeholder="/data" />
      </Form.Item>
      <Form.Item field="filesystem_read_only" label="文件存储只读挂载" triggerPropName="checked">
        <Switch disabled={!values.filesystem_id} />
      </Form.Item>
    </>
  );
}
