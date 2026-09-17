import { Collapse, Form, Input, Switch, Typography } from "@arco-design/web-react";
import {
  ContainerSubnetField,
  ContainerVpcField,
  type ContainerNetworkItem,
} from "@/components/instances/ContainerNetworkFields";
import { ContainerStorageFields } from "@/components/instances/ContainerStorageFields";
import type { Filesystem, FormValues, Volume } from "../../types";

const CollapseItem = Collapse.Item;

type Props = {
  onFieldValueChange: (field: keyof FormValues, value: string | boolean) => void;
  values: FormValues;
  vpcs: ContainerNetworkItem[];
  subnets: ContainerNetworkItem[];
  volumes: Volume[];
  filesystems: Filesystem[];
  defaultSecurityGroup?: ContainerNetworkItem;
  networkLoading: boolean;
};

export function GpuNetworkStorageStep({
  onFieldValueChange,
  values,
  vpcs,
  subnets,
  volumes,
  filesystems,
  defaultSecurityGroup,
  networkLoading,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <ContainerVpcField
          items={vpcs}
          loading={networkLoading}
          required
          allowClear
          onChange={() => onFieldValueChange("subnet_id", "")}
        />
        <ContainerSubnetField
          items={subnets}
          vpcId={values.vpc_id}
          loading={networkLoading}
          required
          allowClear
        />
      </div>
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
      <ContainerStorageFields values={values} volumes={volumes} filesystems={filesystems} />
      <Collapse className="mt-2">
        <CollapseItem header="运行配置" name="runtime-options">
          <Form.Item field="env_text" label="环境变量">
            <Input.TextArea
              placeholder={"KEY=VALUE\nMODEL_PATH=/models"}
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>
          <Form.Item field="auto_start" label="自动启动" triggerPropName="checked">
            <Switch /> <Typography.Text type="secondary">创建后自动拉起副本</Typography.Text>
          </Form.Item>
        </CollapseItem>
      </Collapse>
    </>
  );
}
