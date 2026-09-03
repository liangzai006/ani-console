import {
  Alert,
  Button,
  Descriptions,
  Message,
  Space,
  Tag,
  Typography,
} from "@arco-design/web-react";
import type { components } from "@/api/core-schema";

type VmInstance = components["schemas"]["InstanceRecord"];

export function VmInstanceSshAccess({
  instance,
  onOpenRemote,
}: {
  instance: VmInstance;
  onOpenRemote: () => void;
}) {
  const ssh = instance.ssh;
  const privateIp = instance.network?.private_ip ?? instance.private_ip;
  const available =
    instance.access?.ssh_available !== false && ssh?.ready === true;
  const command =
    privateIp && ssh ? `ssh -p ${ssh.port} ${ssh.username}@${privateIp}` : "";

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command);
      Message.success("SSH 命令已复制");
    } catch {
      Message.error("复制失败，请手动复制 SSH 命令");
    }
  };

  return (
    <Space direction="vertical" size={20} className="w-full">
      <Descriptions
        title="SSH 连接信息"
        column={1}
        labelStyle={{ width: '120px' }}
        data={[
          {
            label: "连接状态",
            value: available ? (
              <Tag color="green">可连接</Tag>
            ) : (
              <Tag color="orange">未就绪</Tag>
            ),
          },
          { label: "用户名", value: ssh?.username ?? "-" },
          {
            label: "地址",
            value: privateIp && ssh ? `${privateIp}:${ssh.port}` : "-",
          },
          { label: "密钥引用", value: ssh?.key_ref ?? "-" },
        ]}
      />
      {!available ? (
        <Alert
          type="warning"
          showIcon
          content={
            ssh?.reason ?? instance.access?.reason ?? "SSH 尚未就绪，请稍后重试"
          }
        />
      ) : null}
      {command ? (
        <div>
          <Typography.Title heading={6}>连接命令</Typography.Title>
          <pre className="overflow-auto rounded bg-(--color-fill-2) p-4 text-sm">
            {command}
          </pre>
        </div>
      ) : null}
      <Space>
        <Button
          type="primary"
          disabled={!available || !command}
          onClick={() => void copyCommand()}
        >
          复制 SSH 命令
        </Button>
        <Button onClick={onOpenRemote}>改用远程连接</Button>
      </Space>
    </Space>
  );
}
