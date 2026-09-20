import {
  deleteSandboxPort,
  type InstanceRecord,
  type SandboxInstanceStatus,
} from "@/api/instances";
import { DataTable } from "@/components/common";
import { copyToClipboard } from "@/lib/clipboard";
import { Button, Empty, Modal, Space, Tag, Typography } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SandboxPortOpenModal } from "./SandboxPortOpenModal";
import { SandboxTokenIssueModal } from "./SandboxTokenIssueModal";

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
  const running = sandbox.session_state === "running";
  const tokenAvailable = sandbox.connectivity?.token_available !== false;
  const portsAvailable = sandbox.connectivity?.ports_available !== false;

  const closePort = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "sandbox-port-close",
        action: "预览端口关闭",
        successText: "预览端口已关闭",
        errorFallback: "预览端口关闭失败",
      },
    },
    mutationFn: async (targetPort: number) => {
      await deleteSandboxPort(instance.id, targetPort);
      return targetPort;
    },
    onSuccess: () => {
      onChanged();
    },
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
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Typography.Title heading={6}>预览端口</Typography.Title>
          <Space>
            <Button
              size="small"
              disabled={!running || !portsAvailable}
              onClick={() => setPortVisible(true)}
            >
              打开预览
            </Button>
          </Space>
        </div>
        <DataTable<SandboxPortSummary>
          data={sandbox.ports ?? []}
          rowKey={(item) => String(item.port)}
          pagination={false}
          noDataElement={<Empty description="暂无预览端口" />}
          rowActions={[
            {
              key: "copy",
              label: "复制",
              disabled: (item) => !item.preview_url,
              onClick: (item) => {
                if (item.preview_url) void copyToClipboard(item.preview_url, "预览地址");
              },
            },
            {
              key: "close",
              label: "关闭",
              intent: "danger",
              disabled: () => closePort.isPending,
              onClick: (item) => confirmClosePort(item.port),
            },
          ]}
          columns={[
            {
              title: "端口",
              width: 100,
              render: (_, item) => `:${item.port}`,
            },
            // { title: "名称", dataIndex: "name", placeholder: "-" },
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
              width: 200,
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
          ]}
        />
      </section>

      <Space direction="vertical" size={24} className="w-full">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Typography.Title heading={6}>短期连接令牌</Typography.Title>
            <Button
              size="small"
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
      </Space>

      <SandboxTokenIssueModal
        instance={instance}
        visible={tokenVisible}
        onCancel={() => setTokenVisible(false)}
      />

      <SandboxPortOpenModal
        instance={instance}
        visible={portVisible}
        onCancel={() => setPortVisible(false)}
        onSuccess={onChanged}
      />
    </>
  );
}
