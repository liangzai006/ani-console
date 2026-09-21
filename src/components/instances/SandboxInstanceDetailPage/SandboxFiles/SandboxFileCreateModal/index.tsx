import { writeSandboxFile } from "@/api/instances";
import { Checkbox, Form, Input, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { encodeSandboxText } from "../../utils";

export function SandboxFileCreateModal({
  instanceId,
  directory,
  onCancel,
  onCreated,
}: {
  instanceId: string;
  directory: string;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [filePath, setFilePath] = useState("");
  const [content, setContent] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const writeFile = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "sandbox-file-write",
        action: "文件写入",
        successText: "文件已写入沙箱工作区",
        errorFallback: "文件写入失败",
      },
    },
    mutationFn: () =>
      writeSandboxFile(instanceId, {
        path: resolvePath(directory, filePath.trim()),
        content_base64: encodeSandboxText(content),
        overwrite,
      }),
    onSuccess: () => {
      onCreated();
      onCancel();
    },
  });

  return (
    <Modal
      visible
      title="新建文本文件"
      confirmLoading={writeFile.isPending}
      okButtonProps={{ disabled: !filePath.trim() }}
      onCancel={onCancel}
      onOk={() => writeFile.mutate()}
    >
      <Form layout="vertical">
        <Form.Item label="文件路径" required>
          <Input
            value={filePath}
            onChange={setFilePath}
            placeholder="例如 notes/readme.txt"
            prefix={directory === "." ? undefined : `${directory}/`}
          />
        </Form.Item>
        <Form.Item label="文本内容" required>
          <Input.TextArea
            value={content}
            onChange={setContent}
            autoSize={{ minRows: 8, maxRows: 16 }}
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" }}
          />
        </Form.Item>
        <Form.Item label="覆盖同名文件">
          <Checkbox checked={overwrite} onChange={setOverwrite}>
            允许覆盖
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}

function resolvePath(directory: string, path: string) {
  if (directory === "." || path.startsWith("/")) return path;
  return `${directory.replace(/\/$/, "")}/${path}`;
}
