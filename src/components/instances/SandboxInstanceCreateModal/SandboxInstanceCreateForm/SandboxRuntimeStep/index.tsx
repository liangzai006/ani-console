import { Alert, Form, Input, Select, Switch, Typography } from "@arco-design/web-react";
import { IDLE_TIMEOUT_OPTIONS, SESSION_TIMEOUT_OPTIONS, type FormValues } from "../../types";

export function SandboxRuntimeStep({ values }: { values: FormValues }) {
  return (
    <>
      <Form.Item
        field="session_timeout"
        label="最长运行时长"
        rules={[{ required: true, message: "请选择最长运行时长" }]}
      >
        <Select options={SESSION_TIMEOUT_OPTIONS} />
      </Form.Item>
      <Form.Item
        field="idle_timeout"
        label="空闲超时"
        rules={[{ required: true, message: "请选择空闲超时" }]}
      >
        <Select options={IDLE_TIMEOUT_OPTIONS} />
      </Form.Item>
      <Form.Item
        field="on_timeout"
        label="到期策略"
        rules={[{ required: true, message: "请选择到期策略" }]}
      >
        <Select>
          <Select.Option value="pause">暂停并保留工作区</Select.Option>
          <Select.Option value="kill">销毁 Sandbox</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item
        field="egress_policy"
        label="网络出口"
        rules={[{ required: true, message: "请选择网络出口策略" }]}
      >
        <Select>
          <Select.Option value="deny_all">禁止访问外部网络</Select.Option>
          <Select.Option value="allowlist">仅允许白名单地址</Select.Option>
          <Select.Option value="internet">允许访问公网</Select.Option>
        </Select>
      </Form.Item>
      {values.egress_policy === "allowlist" ? (
        <Form.Item
          field="egress_allowlist"
          label="出口白名单"
          extra="每行填写一个 host，例如 pypi.org；不要填写协议或路径。"
          rules={[{ required: true, message: "请填写至少一个允许访问的 host" }]}
        >
          <Input.TextArea
            placeholder={"pypi.org\ngithub.com"}
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
        </Form.Item>
      ) : null}
      <Form.Item field="auto_start" label="自动启动" triggerPropName="checked">
        <Switch /> <Typography.Text type="secondary">创建后立即启动 Sandbox</Typography.Text>
      </Form.Item>
      <Alert
        type="info"
        showIcon
        content="Sandbox 使用隔离运行环境，不选择 VPC、安全组或挂载存储；网络访问由出口策略控制。"
      />
    </>
  );
}
