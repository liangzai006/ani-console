import type { InstanceRecord } from "@/api/instances";
import { Alert, Button, Descriptions, Space, Tag, Typography } from "@arco-design/web-react";
import { copyToClipboard } from "@/lib/clipboard";

type VmInstance = InstanceRecord;

export function VmInstanceSshAccess({
  instance,
  onOpenConsole,
}: {
  instance: VmInstance;
  onOpenConsole: () => void;
}) {
  const ssh = instance.ssh;
  const privateIp = instance.network?.private_ip ?? instance.private_ip;
  const available = instance.access?.ssh_available !== false && ssh?.ready === true;
  const command = privateIp && ssh ? `ssh -p ${ssh.port} ${ssh.username}@${privateIp}` : "";

  return (
    <Space direction="vertical" size={20} className="w-full">
      <Descriptions
        title="SSH 连接信息"
        column={1}
        labelStyle={{ width: "120px" }}
        data={[
          {
            label: "连接状态",
            value: available ? <Tag color="green">可连接</Tag> : <Tag color="orange">未就绪</Tag>,
          },
          { label: "用户名", value: ssh?.username ?? "-" },
          {
            label: "地址",
            value: privateIp && ssh ? `${privateIp}:${ssh.port}` : "-",
          },
          { label: "登录密钥", value: ssh?.key_ref ?? "-" },
        ]}
      />
      {!available ? (
        <Alert
          type="warning"
          showIcon
          content={ssh?.reason ?? instance.access?.reason ?? "SSH 尚未就绪，请稍后重试"}
        />
      ) : null}
      {command ? (
        <div>
          <Typography.Title heading={6}>连接命令</Typography.Title>
          <pre className="overflow-auto rounded bg-app--fillsecondary) p-4 text-sm">{command}</pre>
        </div>
      ) : null}
      <Space>
        <Button
          type="primary"
          disabled={!available || !command}
          onClick={() => void copyToClipboard(command, "SSH 命令")}
        >
          复制 SSH 命令
        </Button>
        <Button onClick={onOpenConsole}>打开控制台</Button>
      </Space>
    </Space>
  );
}
