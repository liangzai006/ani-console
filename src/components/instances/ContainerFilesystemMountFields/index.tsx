import { Form, Input, Select, Switch } from "@arco-design/web-react";

export type ContainerFilesystemItem = {
  id: string;
  name?: string | null;
  size_gib?: number;
};

export type ContainerFilesystemMountValues = {
  filesystem_id: string;
  filesystem_mount_path: string;
  filesystem_read_only: boolean;
};

export function ContainerFilesystemMountFields({
  values,
  filesystems,
  mountPathError,
}: {
  values: ContainerFilesystemMountValues;
  filesystems?: ContainerFilesystemItem[];
  mountPathError?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-4">
      <Form.Item field="filesystem_id" label="文件存储">
        <Select allowClear placeholder="不挂载文件存储">
          {filesystems?.map((item) => (
            <Select.Option key={item.id} value={item.id}>
              {item.name ?? item.id}
              {item.size_gib ? ` · ${item.size_gib}Gi` : ""}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        field="filesystem_mount_path"
        label="挂载路径"
        rules={
          values.filesystem_id ? [{ required: true, message: "请输入文件存储挂载路径" }] : undefined
        }
        validateStatus={mountPathError ? "error" : undefined}
        help={mountPathError}
      >
        <Input disabled={!values.filesystem_id} placeholder="/data" />
      </Form.Item>
      <Form.Item field="filesystem_read_only" label="只读挂载" triggerPropName="checked">
        <Switch disabled={!values.filesystem_id} />
      </Form.Item>
    </div>
  );
}
