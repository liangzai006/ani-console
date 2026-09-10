import {
  createSandboxPort,
  deleteSandboxPort,
  type InstanceRecord,
  type SandboxInstanceStatus,
} from "@/api/instances";
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "@/components/common";
import { getImageDisplayName } from "@/lib/render";
import { SandboxTokenIssueModal } from "./SandboxTokenIssueModal";
import { copySandboxText, showSandboxError } from "../utils";

type SandboxInstance = InstanceRecord;
type SandboxStatus = NonNullable<SandboxInstanceStatus>;
type SandboxPortSummary = NonNullable<SandboxStatus["ports"]>[number];

export function SandboxAccessPanel({
  instance,
  onChanged,
}: {
  instance: SandboxInstance;
  onChanged: () => void;
}) {
  const sandbox = instance.sandbox!;
  const [tokenVisible, setTokenVisible] = useState(false);
  const [portVisible, setPortVisible] = useState(false);
  const [port, setPort] = useState(8080);
  const [portName, setPortName] = useState("");
  const [protocol, setProtocol] = useState<"tcp" | "http">("http");
  const running = sandbox.session_state === "running";
  const tokenAvailable = sandbox.connectivity?.token_available !== false;
  const portsAvailable = sandbox.connectivity?.ports_available !== false;
  const browserTemplate = getImageDisplayName(instance.image).toLowerCase().includes("browser");

  const createPort = useMutation({
    mutationFn: async () => {
      const submitData = {
        port,
        name: portName.trim() || undefined,
        protocol,
      };
      return createSandboxPort(instance.id, submitData);
    },
    onSuccess: () => {
      setPortVisible(false);
      setPortName("");
      Message.success("预览端口已开放");
      onChanged();
    },
    onError: (error) => showSandboxError(error, "预览端口开放失败"),
  });

  const closePort = useMutation({
    mutationFn: async (targetPort: number) => {
      await deleteSandboxPort(instance.id, targetPort);
      return targetPort;
    },
    onSuccess: (targetPort) => {
      Message.success(`端口 ${targetPort} 已关闭`);
      onChanged();
    },
    onError: (error) => showSandboxError(error, "预览端口关闭失败"),
  });

  const confirmClosePort = (targetPort: number) => {
    Modal.confirm({
      title: `关闭预览端口 ${targetPort}`,
      content: "关闭后，现有临时预览地址将不可继续访问。",
      okButtonProps: { status: "danger" },
      onOk: () => closePort.mutateAsync(targetPort),
    });
  };

  return (
    <>
      <Space direction="vertical" size={24} className="w-full">
        <Alert
          type="info"
          content="预览地址由 Sandbox Runtime 临时签发，不创建或暴露 Kubernetes Ingress。连接令牌仅在签发响应中显示一次。"
        />

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Typography.Title heading={6}>短期连接令牌</Typography.Title>
            <Button
              size="small"
              type="primary"
              disabled={!running || !tokenAvailable}
              onClick={() => setTokenVisible(true)}
            >
              签发令牌
            </Button>
          </div>
          <Typography.Text type="secondary">
            在弹窗中配置有效期与授权范围；签发结果仅显示一次。
          </Typography.Text>
        </section>

        {browserTemplate ? (
          <Alert
            type="info"
            content="检测到浏览器类模板，可开放 9222 端口用于 CDP 或受控浏览器预览。"
          />
        ) : null}

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Typography.Title heading={6}>预览端口</Typography.Title>
            <Space>
              <Button size="small" onClick={onChanged}>
                刷新
              </Button>
              <Button
                size="small"
                disabled={!running || !portsAvailable}
                onClick={() => setPortVisible(true)}
              >
                开放预览端口
              </Button>
            </Space>
          </div>
          <DataTable<SandboxPortSummary>
            data={sandbox.ports ?? []}
            rowKey={(item) => String(item.port)}
            pagination={false}
            noDataElement={<Empty description="暂无预览端口" />}
            columns={[
              {
                title: "端口",
                width: 100,
                render: (_, item) => `:${item.port}`,
              },
              { title: "名称", dataIndex: "name", placeholder: "-" },
              {
                title: "协议",
                width: 100,
                dataIndex: "protocol",
                placeholder: "tcp",
              },
              {
                title: "状态",
                width: 120,
                render: (_, item) => (
                  <Tag color={item.status === "available" ? "green" : "orange"}>{item.status}</Tag>
                ),
              },
              {
                title: "预览地址",
                ellipsis: true,
                render: (_, item) =>
                  item.preview_url ? (
                    <a
                      href={item.preview_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[rgb(var(--link-6))]"
                    >
                      {item.preview_url}
                    </a>
                  ) : (
                    "-"
                  ),
              },
              {
                title: "操作",
                width: 150,
                fixed: "right",
                render: (_, item) => (
                  <Space>
                    <Button
                      type="text"
                      size="small"
                      disabled={!item.preview_url}
                      onClick={() =>
                        item.preview_url && copySandboxText(item.preview_url, "预览地址已复制")
                      }
                    >
                      复制
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      status="danger"
                      disabled={closePort.isPending}
                      onClick={() => confirmClosePort(item.port)}
                    >
                      关闭
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </section>
      </Space>

      <SandboxTokenIssueModal
        instance={instance}
        visible={tokenVisible}
        onCancel={() => setTokenVisible(false)}
      />

      <Modal
        title="开放预览端口"
        visible={portVisible}
        confirmLoading={createPort.isPending}
        onCancel={() => {
          setPortVisible(false);
        }}
        onOk={() => createPort.mutate()}
        okButtonProps={{ disabled: port < 1 || port > 65535 }}
      >
        <Form layout="vertical">
          <Form.Item label="端口" required>
            <InputNumber
              value={port}
              min={1}
              max={65535}
              precision={0}
              onChange={(value) => setPort(Number(value) || 0)}
            />
          </Form.Item>
          <Form.Item label="名称">
            <Input value={portName} onChange={setPortName} placeholder="例如 web-preview" />
          </Form.Item>
          <Form.Item label="协议" required>
            <Select
              value={protocol}
              onChange={setProtocol}
              options={[
                { label: "HTTP", value: "http" },
                { label: "TCP", value: "tcp" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
