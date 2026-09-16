import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Form,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Typography,
} from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { getRegistryPushInstructions, type RegistryProject } from "@/api/registry";
import { getErrorMessage } from "@/lib/errors";

interface RegistryPushInstructionsModalProps {
  visible: boolean;
  projects?: RegistryProject[];
  onCancel: () => void;
}

function copyCommand(command: string) {
  void navigator.clipboard.writeText(command).then(() => Message.success("命令已复制"));
}

export function RegistryPushInstructionsModal({
  visible,
  projects,
  onCancel,
}: RegistryPushInstructionsModalProps) {
  const [project, setProject] = useState("");
  const [repository, setRepository] = useState("demo/app");
  const instructions = useQuery({
    queryKey: ["registry-push-instructions", project, repository],
    queryFn: () => getRegistryPushInstructions(project, repository.trim() || "demo/app"),
    enabled: visible && Boolean(project),
  });

  useEffect(() => {
    if (!project && projects?.[0]) setProject(projects[0].name);
  }, [project, projects]);

  return (
    <Modal
      visible={visible}
      title="推送镜像说明"
      footer={null}
      onCancel={onCancel}
      style={{ width: 720 }}
    >
      <Typography.Paragraph type="secondary">
        镜像通过 docker push 入库，不支持网页上传。项目由平台按当前租户自动创建，Console
        不展示或下发凭据明文。
      </Typography.Paragraph>
      <Form layout="vertical">
        <Form.Item label="项目" required>
          <Select
            value={project}
            onChange={setProject}
            options={(projects ?? []).map((item) => ({
              value: item.name,
              label: item.name,
            }))}
          />
        </Form.Item>
        <Form.Item label="仓库路径">
          <Input value={repository} onChange={setRepository} placeholder="例如 demo/app" />
        </Form.Item>
      </Form>
      {instructions.isLoading ? (
        <Typography.Text type="secondary">正在获取推送说明…</Typography.Text>
      ) : instructions.isError ? (
        <Typography.Text type="error">
          {getErrorMessage(instructions.error, "推送说明加载失败")}
        </Typography.Text>
      ) : instructions.data ? (
        <Space direction="vertical" className="w-full">
          {instructions.data.commands.map((item) => (
            <div key={item.label} className="rounded border border-app-border-strong p-3">
              <div className="mb-2 flex items-center justify-between">
                <Typography.Text className="font-medium">{item.label}</Typography.Text>
                <Button size="mini" type="text" onClick={() => copyCommand(item.command)}>
                  复制
                </Button>
              </div>
              <Typography.Text code className="break-all">
                {item.command}
              </Typography.Text>
            </div>
          ))}
        </Space>
      ) : (
        <Typography.Text type="secondary">当前租户项目暂不可用，请刷新后重试。</Typography.Text>
      )}
    </Modal>
  );
}
