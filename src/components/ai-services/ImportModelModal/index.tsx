import { Alert, Form, Input, Message, Modal, Select, Typography } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { importModel, type ImportModelRequest } from "@/api/ai-services/models";
import { showApiError } from "@/lib/api-error";

type ImportSource = ImportModelRequest["source"];

export function ImportModelModal({
  visible,
  onCancel,
  onSubmitted,
}: {
  visible: boolean;
  onCancel: () => void;
  onSubmitted?: () => void;
}) {
  const qc = useQueryClient();
  const [source, setSource] = useState<ImportSource>("huggingface");
  const [repoId, setRepoId] = useState("");
  const [revision, setRevision] = useState("main");

  const reset = () => {
    setSource("huggingface");
    setRepoId("");
    setRevision("main");
  };

  const submit = useMutation({
    mutationFn: async () => {
      const trimmedRepoId = repoId.trim();
      if (trimmedRepoId.length < 3) throw new Error("请输入有效的模型仓库 ID");
      const submitData = {
        source,
        repo_id: trimmedRepoId,
        revision: revision.trim() || "main",
      };
      return importModel(submitData);
    },
    onSuccess: (task) => {
      Message.success("模型导入任务已提交" + (task?.id ? " · " + task.id : ""));
      void qc.invalidateQueries({ queryKey: ["models"] });
      reset();
      onCancel();
      onSubmitted?.();
    },
    onError: (error) => showApiError(error, "提交模型导入任务失败"),
  });

  return (
    <Modal
      visible={visible}
      title="导入模型"
      okText="开始导入"
      confirmLoading={submit.isPending}
      onCancel={() => {
        reset();
        onCancel();
      }}
      onOk={() => submit.mutateAsync()}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="来源" required>
          <Select
            value={source}
            onChange={setSource}
            options={[
              { value: "huggingface", label: "HuggingFace" },
              { value: "modelscope", label: "ModelScope" },
            ]}
          />
        </Form.Item>
        <Form.Item label="仓库 ID" required>
          <Input
            value={repoId}
            onChange={setRepoId}
            placeholder="例如 Qwen/Qwen2.5-7B-Instruct"
            maxLength={256}
            showWordLimit
          />
        </Form.Item>
        <Form.Item label="版本 / Revision">
          <Input value={revision} onChange={setRevision} placeholder="main" maxLength={128} />
        </Form.Item>
        <Alert
          type="info"
          showIcon
          content="导入请求将异步执行。提交后可在模型列表中查看等待、下载和完成状态。"
        />
        <Typography.Text type="secondary">
          仓库 ID 使用“组织/模型”格式；失败重试会复用同一幂等键，修改来源、仓库或版本后会生成新键。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
