import {
  cloneSandboxCheckpoint,
  createSandboxCheckpoint,
  listSandboxCheckpoints,
  restoreSandboxCheckpoint,
  type SandboxCheckpoint,
} from "@/api/instances";
import { DataTable } from "@/components/common";
import { formatBytes, formatDateTime } from "@/lib/format";
import { withId } from "@/lib/id";
import { navigateToResourceDetail } from "@/lib/resources";
import {
  Button,
  Empty,
  Form,
  Input,
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
    meta: {
      errorNotification: {
        id: withId("sandbox-checkpoints", instanceId),
        action: "检查点加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["sandbox-checkpoints", instanceId],
    queryFn: () => listSandboxCheckpoints(instanceId),
  });
  const createCheckpoint = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "sandbox-checkpoint-create",
        action: "检查点创建",
        successText: "检查点已创建",
        errorFallback: "检查点创建失败",
      },
    },
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
      void checkpoints.refetch();
      onChanged();
    },
  });

  const restoreCheckpoint = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "sandbox-checkpoint-restore",
        action: "检查点恢复",
        successText: "检查点已恢复",
        errorFallback: "检查点恢复失败",
      },
    },
    mutationFn: async (checkpoint: SandboxCheckpoint) => {
      await restoreSandboxCheckpoint(instanceId, checkpoint.id);
      return checkpoint;
    },
    onSuccess: () => {
      void checkpoints.refetch();
      onChanged();
    },
  });

  const cloneCheckpoint = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "sandbox-checkpoint-clone",
        action: "检查点克隆",
        errorFallback: "检查点克隆失败",
      },
    },
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
        title: "沙箱克隆已创建",
        content: `${data.instance.name} 已从检查点创建。`,
        okText: "查看新实例",
        onOk: () =>
          navigateToResourceDetail(navigate, {
            type: "sandbox-instance",
            id: data.instance.id,
          }),
      });
    },
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

          <DataTable<SandboxCheckpoint>
            data={checkpoints.data?.items ?? []}
            rowKey="id"
            loading={checkpoints.isLoading || checkpoints.isFetching}
            pagination={false}
            noDataElement={<Empty description="暂无检查点" />}
            rowActions={[
              {
                key: "restore",
                label: "恢复",
                disabled: (item) => item.status !== "available" || !canCheckpoint,
                onClick: confirmRestore,
              },
              {
                key: "clone",
                label: "克隆",
                disabled: (item) => item.status !== "available",
                onClick: (item) => {
                  setCloneTarget(item);
                  setCloneName(`${item.name}-clone`);
                },
              },
            ]}
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
          <Form.Item label="新沙箱名称" required>
            <Input value={cloneName} onChange={setCloneName} maxLength={128} showWordLimit />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
