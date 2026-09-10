import {
  cloneSandboxCheckpoint,
  createSandboxCheckpoint,
  listSandboxCheckpoints,
  restoreSandboxCheckpoint,
  type SandboxCheckpoint,
} from "@/api/instances";
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  Message,
  Modal,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable } from "@/components/common";
import { formatBytes, formatDateTime } from "@/lib/format";
import { showSandboxError } from "../utils";

export function SandboxCheckpointsPanel({
  instanceId,
  sessionState,
  onChanged,
}: {
  instanceId: string;
  sessionState: string;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const [createVisible, setCreateVisible] = useState(false);
  const [checkpointName, setCheckpointName] = useState("");
  const [keepMemory, setKeepMemory] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<SandboxCheckpoint>();
  const [cloneName, setCloneName] = useState("");
  const canCheckpoint = ["running", "paused"].includes(sessionState);

  const checkpoints = useQuery({
    queryKey: ["sandbox-checkpoints", instanceId],
    queryFn: () => listSandboxCheckpoints(instanceId),
  });

  const createCheckpoint = useMutation({
    mutationFn: async () => {
      const submitData = {
        name: checkpointName.trim(),
        keep_memory: keepMemory,
      };
      return createSandboxCheckpoint(instanceId, submitData);
    },
    onSuccess: () => {
      setCreateVisible(false);
      setCheckpointName("");
      setKeepMemory(false);
      Message.success("检查点已创建");
      void checkpoints.refetch();
      onChanged();
    },
    onError: (error) => showSandboxError(error, "检查点创建失败"),
  });

  const restoreCheckpoint = useMutation({
    mutationFn: async (checkpoint: SandboxCheckpoint) => {
      await restoreSandboxCheckpoint(instanceId, checkpoint.id);
      return checkpoint;
    },
    onSuccess: () => {
      Message.success("检查点已恢复");
      void checkpoints.refetch();
      onChanged();
    },
    onError: (error) => showSandboxError(error, "检查点恢复失败"),
  });

  const cloneCheckpoint = useMutation({
    mutationFn: async () => {
      if (!cloneTarget) throw new Error("请选择要克隆的检查点");
      const submitData = { name: cloneName.trim() };
      const data = await cloneSandboxCheckpoint(instanceId, cloneTarget.id, submitData);
      return { data, checkpointId: cloneTarget.id };
    },
    onSuccess: ({ data }) => {
      setCloneTarget(undefined);
      setCloneName("");
      Modal.success({
        title: "Sandbox 克隆已创建",
        content: `${data.instance.name} 已从检查点创建。`,
        okText: "查看新实例",
        onOk: () =>
          navigate({
            to: "/sandbox-instances/$instanceId",
            params: { instanceId: data.instance.id },
          }),
      });
    },
    onError: (error) => showSandboxError(error, "检查点克隆失败"),
  });

  const confirmRestore = (checkpoint: SandboxCheckpoint) => {
    Modal.confirm({
      title: `恢复检查点 ${checkpoint.name}`,
      content: "当前工作区内容将回滚到该检查点，此操作会覆盖此后产生的文件变更。",
      okButtonProps: { status: "danger" },
      onOk: () => restoreCheckpoint.mutateAsync(checkpoint),
    });
  };

  return (
    <>
      <Space direction="vertical" size={24} className="w-full">
        <Alert
          type="info"
          content="检查点保存工作区文件系统；内存快照是否可用取决于当前 Runtime。恢复会覆盖当前工作区，克隆则创建新 Sandbox。"
        />
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Typography.Title heading={6}>检查点</Typography.Title>
            <Space>
              <Button
                size="small"
                loading={checkpoints.isFetching}
                onClick={() => checkpoints.refetch()}
              >
                刷新
              </Button>
              <Button
                size="small"
                type="primary"
                disabled={!canCheckpoint}
                onClick={() => setCreateVisible(true)}
              >
                创建检查点
              </Button>
            </Space>
          </div>

          {checkpoints.error ? (
            <Alert className="mb-3" type="error" content="检查点加载失败，请刷新重试。" />
          ) : null}

          <DataTable<SandboxCheckpoint>
            data={checkpoints.data?.items ?? []}
            rowKey="id"
            loading={checkpoints.isLoading || checkpoints.isFetching}
            pagination={false}
            noDataElement={<Empty description="暂无检查点" />}
            columns={[
              {
                title: "名称",
                ellipsis: true,
                dataIndex: "name",
              },
              {
                title: "状态",
                width: 120,
                render: (_, item) => (
                  <Tooltip content={item.reason ?? ""}>
                    <Tag color={item.status === "available" ? "green" : "orange"}>
                      {item.status}
                    </Tag>
                  </Tooltip>
                ),
              },
              {
                title: "内容",
                width: 120,
                render: (_, item) => (item.keep_memory ? "文件系统 + 内存" : "仅文件系统"),
              },
              {
                title: "大小",
                width: 110,
                render: (_, item) => formatBytes(item.size_bytes ?? undefined),
              },
              {
                title: "创建时间",
                width: 180,
                render: (_, item) => formatDateTime(item.created_at),
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
                      disabled={item.status !== "available" || !canCheckpoint}
                      onClick={() => confirmRestore(item)}
                    >
                      恢复
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      disabled={item.status !== "available"}
                      onClick={() => {
                        setCloneTarget(item);
                        setCloneName(`${item.name}-clone`);
                      }}
                    >
                      克隆
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </section>
      </Space>

      <Modal
        title="创建检查点"
        visible={createVisible}
        confirmLoading={createCheckpoint.isPending}
        okButtonProps={{ disabled: !checkpointName.trim() }}
        onCancel={() => {
          setCreateVisible(false);
        }}
        onOk={() => createCheckpoint.mutate()}
      >
        <Form layout="vertical">
          <Form.Item label="检查点名称" required>
            <Input
              value={checkpointName}
              onChange={setCheckpointName}
              placeholder="例如 before-upgrade"
              maxLength={128}
              showWordLimit
            />
          </Form.Item>
          <Form.Item label="包含内存状态">
            <Switch checked={keepMemory} onChange={setKeepMemory} />
          </Form.Item>
          {keepMemory ? (
            <Alert
              type="warning"
              content="当前 Runtime 若不支持内存检查点，提交会返回明确错误；可关闭此选项仅保存文件系统。"
            />
          ) : null}
        </Form>
      </Modal>

      <Modal
        title={`从检查点克隆${cloneTarget ? ` · ${cloneTarget.name}` : ""}`}
        visible={Boolean(cloneTarget)}
        confirmLoading={cloneCheckpoint.isPending}
        okButtonProps={{ disabled: !cloneName.trim() }}
        onCancel={() => {
          setCloneTarget(undefined);
        }}
        onOk={() => cloneCheckpoint.mutate()}
      >
        <Form layout="vertical">
          <Form.Item label="新 Sandbox 名称" required>
            <Input value={cloneName} onChange={setCloneName} maxLength={128} showWordLimit />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
