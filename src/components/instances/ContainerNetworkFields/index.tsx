import { Form, Select } from "@arco-design/web-react";

export type ContainerNetworkItem = {
  id: string;
  name?: string | null;
  cidr?: string | null;
  vpc_id?: string | null;
};

type ContainerVpcFieldProps = {
  items: ContainerNetworkItem[];
  loading: boolean;
  required?: boolean;
  allowClear?: boolean;
  placeholder?: string;
  onChange: () => void;
};

export function ContainerVpcField({
  items,
  loading,
  required = false,
  allowClear = false,
  placeholder = "选择 VPC",
  onChange,
}: ContainerVpcFieldProps) {
  return (
    <Form.Item
      field="vpc_id"
      label="VPC"
      rules={required ? [{ required: true, message: "请选择 VPC" }] : undefined}
    >
      <Select
        allowClear={allowClear}
        loading={loading}
        placeholder={placeholder}
        onChange={onChange}
      >
        {items.map((item) => (
          <Select.Option key={item.id} value={item.id}>
            {item.name ?? item.id}
            {item.cidr ? ` · ${item.cidr}` : ""}
          </Select.Option>
        ))}
      </Select>
    </Form.Item>
  );
}

type ContainerSubnetFieldProps = {
  items: ContainerNetworkItem[];
  vpcId: string;
  loading: boolean;
  required?: boolean;
  allowClear?: boolean;
};

export function ContainerSubnetField({
  items,
  vpcId,
  loading,
  required = false,
  allowClear = false,
}: ContainerSubnetFieldProps) {
  const availableSubnets = items.filter((item) => !vpcId || item.vpc_id === vpcId);

  return (
    <Form.Item
      field="subnet_id"
      label="子网"
      rules={required ? [{ required: true, message: "请选择子网" }] : undefined}
    >
      <Select
        allowClear={allowClear}
        loading={loading}
        disabled={!vpcId}
        placeholder={vpcId ? "选择子网" : "先选择 VPC"}
      >
        {availableSubnets.map((item) => (
          <Select.Option key={item.id} value={item.id}>
            {item.name ?? item.id}
            {item.cidr ? ` · ${item.cidr}` : ""}
          </Select.Option>
        ))}
      </Select>
    </Form.Item>
  );
}
