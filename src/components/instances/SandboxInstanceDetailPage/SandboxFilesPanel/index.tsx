import { withId } from "@/lib/id";
import {
  deleteSandboxFile,
  listSandboxFiles,
  writeSandboxFile,
  type SandboxFile,
} from "@/api/instances";
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
} from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "@/components/common";
import { formatBytes, formatDateTime } from "@/lib/format";
import { copyToClipboard } from "@/lib/clipboard";
import { encodeSandboxText } from "../utils";

export function SandboxFilesPanel({
  instanceId,
  running,
  onChanged,
}: {
  instanceId: string;
  running: boolean;
  onChanged: () => void;
}) {
  const [directory, setDirectory] = useState(".");
  const [pathInput, setPathInput] = useState(".");
  const [editorVisible, setEditorVisible] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [content, setContent] = useState("");
  const [overwrite, setOverwrite] = useState(false);

  const files = useQuery({
    meta: {
      errorNotification: {
        id: withId("sandbox-files", instanceId, directory),
        action: "工作区文件加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["sandbox-files", instanceId, directory],
    queryFn: () => listSandboxFiles(instanceId, { path: directory, limit: 500 }),
  });
  const writeFile = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "sandbox-file-write",
        action: "文件写入",
        successText: "文件已写入 Sandbox 工作区",
        errorFallback: "文件写入失败",
      },
    },
    mutationFn: async () => {
      const path = resolvePath(directory, filePath.trim());
      const submitData = {
        path,
        content_base64: encodeSandboxText(content),
        overwrite,
      };
      return writeSandboxFile(instanceId, submitData);
    },
    onSuccess: () => {
      setEditorVisible(false);
      setFilePath("");
      setContent("");
      setOverwrite(false);
      void files.refetch();
      onChanged();
    },
  });

  const deleteFile = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "sandbox-file-delete",
        action: "文件删除",
        successText: "文件已删除",
        errorFallback: "文件删除失败",
      },
    },
    mutationFn: async (path: string) => {
      await deleteSandboxFile(instanceId, path);
      return path;
    },
    onSuccess: () => {
      void files.refetch();
      onChanged();
    },
  });

  const openDirectory = (path: string) => {
    setDirectory(path || ".");
    setPathInput(path || ".");
  };

  const confirmDelete = (item: SandboxFile) => {
    Modal.confirm({
      title: "删除工作区文件",
      content: `确认删除 ${item.path}？此操作无法撤销。`,
      okButtonProps: { status: "danger" },
      onOk: () => deleteFile.mutateAsync(item.path),
    });
  };

  return (
    <>
      <Space direction="vertical" size={24} className="w-full">
        {!running ? (
          <Alert type="warning" content="当前实例不是运行状态，写入和删除文件不可用。" />
        ) : null}

        <section>
          <Typography.Title heading={6}>工作区文件</Typography.Title>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Input
              className="min-w-60 flex-1"
              aria-label="工作区目录"
              value={pathInput}
              onChange={setPathInput}
              onPressEnter={() => openDirectory(pathInput.trim() || ".")}
            />
            <Button onClick={() => openDirectory(pathInput.trim() || ".")}>打开目录</Button>
            <Button
              disabled={directory === "."}
              onClick={() => openDirectory(parentPath(directory))}
            >
              返回上级
            </Button>
            <Button type="primary" disabled={!running} onClick={() => setEditorVisible(true)}>
              新建文本文件
            </Button>
            <Button loading={files.isFetching} onClick={() => files.refetch()}>
              刷新
            </Button>
          </div>

          <DataTable<SandboxFile>
            data={files.data?.items ?? []}
            rowKey="path"
            loading={files.isLoading || files.isFetching}
            pagination={false}
            noDataElement={<Empty description="当前目录为空" />}
            rowActions={[
              {
                key: "copy-path",
                label: "复制路径",
                visible: (item) => item.kind !== "directory",
                onClick: (item) => void copyToClipboard(item.path, "文件路径"),
              },
              {
                key: "delete",
                label: "删除",
                intent: "danger",
                visible: (item) => item.kind !== "directory",
                disabled: () => !running || deleteFile.isPending,
                onClick: confirmDelete,
              },
            ]}
            columns={[
              {
                title: "路径",
                ellipsis: true,
                dataIndex: "path",
              },
              {
                title: "类型",
                width: 100,
                render: (_, item) => (
                  <Tag color={item.kind === "directory" ? "blue" : "gray"}>
                    {item.kind === "directory" ? "目录" : "文件"}
                  </Tag>
                ),
              },
              {
                title: "大小",
                width: 120,
                render: (_, item) =>
                  item.kind === "directory" ? "-" : formatBytes(item.size_bytes),
              },
              {
                title: "更新时间",
                width: 180,
                render: (_, item) => formatDateTime(item.updated_at),
              },
            ]}
          />
        </section>
      </Space>

      <Modal
        title="新建文本文件"
        visible={editorVisible}
        confirmLoading={writeFile.isPending}
        okButtonProps={{ disabled: !filePath.trim() }}
        onCancel={() => {
          setEditorVisible(false);
        }}
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
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
              }}
            />
          </Form.Item>
          <Form.Item label="覆盖同名文件">
            <Checkbox checked={overwrite} onChange={setOverwrite}>
              允许覆盖
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function resolvePath(directory: string, path: string) {
  if (directory === "." || path.startsWith("/")) return path;
  return `${directory.replace(/\/$/, "")}/${path}`;
}

function parentPath(path: string) {
  const parts = path.replace(/^\.\//, "").split("/").filter(Boolean);
  parts.pop();
  return parts.length ? parts.join("/") : ".";
}
