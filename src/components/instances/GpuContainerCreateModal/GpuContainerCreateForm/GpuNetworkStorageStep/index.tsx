import {
  Form,
  Input,
  Select,
  Switch,
  Typography,
} from "@arco-design/web-react";
import type { Filesystem, FormValues } from "../../types";

export type NetworkItem = {
  id: string;
  name?: string | null;
  cidr?: string | null;
  vpc_id?: string | null;
};

type Props = {
  onFieldValueChange: (
    field: keyof FormValues,
    value: string | boolean,
  ) => void;
  values: FormValues;
  vpcs: NetworkItem[];
  subnets: NetworkItem[];
  filesystems: Filesystem[];
  defaultSecurityGroup?: NetworkItem;
  networkLoading: boolean;
};

export function GpuNetworkStorageStep({
  onFieldValueChange,
  values,
  vpcs,
  subnets,
  filesystems,
  defaultSecurityGroup,
  networkLoading,
}: Props) {
  // TODO: 子网接口确认按 vpc_id 过滤后，移除此处创建表单的本地兜底过滤。
  const availableSubnets = subnets.filter(
    (item) => !values.vpc_id || item.vpc_id === values.vpc_id,
  );
  return (
    <>
      <Form.Item
        field="vpc_id"
        label="VPC"
        rules={[{ required: true, message: "请选择 VPC" }]}
      >
        <Select
          loading={networkLoading}
          placeholder="选择 VPC"
          onChange={() => onFieldValueChange("subnet_id", "")}
        >
          {vpcs.map((item) => (
            <Select.Option key={item.id} value={item.id}>
              {item.name ?? item.id} · {item.cidr ?? ""}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        field="subnet_id"
        label="子网"
        rules={[{ required: true, message: "请选择子网" }]}
      >
        <Select
          loading={networkLoading}
          disabled={!values.vpc_id}
          placeholder={values.vpc_id ? "选择子网" : "先选择 VPC"}
        >
          {availableSubnets.map((item) => (
            <Select.Option key={item.id} value={item.id}>
              {item.name ?? item.id} · {item.cidr ?? ""}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item label="安全组">
        <Input
          value={
            defaultSecurityGroup
              ? `自动使用 VPC 默认 · ${defaultSecurityGroup.name ?? defaultSecurityGroup.id}`
              : "平台自动使用或创建默认安全组"
          }
          disabled
        />
      </Form.Item>
      <Form.Item field="env_text" label="环境变量">
        <Input.TextArea
          placeholder={"KEY=VALUE\nMODEL_PATH=/models"}
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </Form.Item>
      <Form.Item field="mount_path" label="卷挂载路径">
        <Input placeholder="/data（可选）" />
      </Form.Item>
      <Form.Item field="filesystem_id" label="文件存储 NFS（可选）">
        <Select allowClear placeholder="不挂载 NFS">
          {filesystems.map((item) => (
            <Select.Option key={item.id} value={item.id}>
              {item.name ?? item.id}
              {item.size_gib ? ` · ${item.size_gib}Gi` : ""}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item field="auto_start" label="自动启动" triggerPropName="checked">
        <Switch />{" "}
        <Typography.Text type="secondary">创建后自动拉起副本</Typography.Text>
      </Form.Item>
    </>
  );
}
