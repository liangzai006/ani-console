import { applyInstanceLifecycle, type InstanceRecord } from "@/api/instances";
import type { RowAction } from "@/components/common";
import { formatDurationSeconds } from "@/components/instances/SandboxInstanceDetailPage/utils";
import { Alert, Modal, Select } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

type Instance = InstanceRecord;
type LifecycleAction = "pause" | "resume" | "extend" | "touch_idle" | "delete";

const TERMINAL_STATES = new Set(["expired", "deleted", "deleting"]);
const BUSY_STATES = new Set<Instance["state"]>([
  "pending",
  "provisioning",
  "starting",
  "stopping",
  "deleting",
]);

function sessionState(instance: Instance) {
  return instance.sandbox?.session_state ?? instance.state;
}

export function useSandboxInstanceRowActions(onChanged: () => void) {
  const navigate = useNavigate();
  const [extendTarget, setExtendTarget] = useState<Instance>();
  const [extendDuration, setExtendDuration] = useState("1h");
  const lifecycle = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "sandbox-lifecycle",
        action: "操作",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async ({
      instance,
      action,
      duration,
    }: {
      instance: Instance;
      action: LifecycleAction;
      duration?: string;
    }) => {
      await applyInstanceLifecycle(instance.id, { action, duration });
    },
    onSuccess: () => {
      setExtendTarget(undefined);
      onChanged();
    },
  });

  const pending = (instance: Instance) =>
    lifecycle.isPending && lifecycle.variables?.instance.id === instance.id;
  const busy = (instance: Instance) => pending(instance) || BUSY_STATES.has(instance.state);
  const running = (instance: Instance) => sessionState(instance) === "running";
  const resumable = (instance: Instance) =>
    sessionState(instance) === "paused" || sessionState(instance) === "stopped";

  const rowActions: Array<RowAction<Instance>> = [
    {
      key: "lifecycle",
      label: (instance) => (running(instance) ? "暂停" : "恢复"),
      widthLabel: "暂停",
      disabled: (instance) => busy(instance) || (!running(instance) && !resumable(instance)),
      loading: pending,
      onClick: (instance) =>
        lifecycle.mutateAsync({ instance, action: running(instance) ? "pause" : "resume" }),
    },
    {
      key: "extend",
      label: "延长会话",
      disabled: (instance) => busy(instance) || TERMINAL_STATES.has(sessionState(instance)),
      onClick: setExtendTarget,
    },
    {
      key: "touch-idle",
      label: "活跃续期",
      disabled: (instance) => busy(instance) || !running(instance),
      onClick: (instance) => lifecycle.mutateAsync({ instance, action: "touch_idle" }),
    },
    {
      key: "terminal",
      label: "打开终端",
      disabled: (instance) => !running(instance) || instance.access?.exec_available === false,
      onClick: (instance) =>
        navigate({
          to: "/sandbox-instances/$instanceId",
          params: { instanceId: instance.id },
          search: { tab: "terminal" },
        }),
    },
    {
      key: "delete",
      label: "销毁",
      intent: "danger",
      disabled: (instance) => busy(instance) || sessionState(instance) === "deleted",
      onClick: (instance) =>
        void Modal.confirm({
          title: "销毁 Sandbox",
          content: `确认销毁「${instance.name || instance.id}」？工作区和未保存数据将不可恢复。`,
          okButtonProps: { status: "danger" },
          onOk: () => lifecycle.mutateAsync({ instance, action: "delete" }),
        }),
    },
  ];

  const dialogNode = extendTarget ? (
    <Modal
      title={`延长会话 · ${extendTarget.name || extendTarget.id}`}
      visible
      confirmLoading={lifecycle.isPending}
      onCancel={() => setExtendTarget(undefined)}
      onOk={() =>
        lifecycle.mutateAsync({
          instance: extendTarget,
          action: "extend",
          duration: extendDuration,
        })
      }
      unmountOnExit
    >
      <Alert
        className="mb-4"
        type="info"
        content={`当前剩余：${formatDurationSeconds(extendTarget.sandbox?.remain_seconds)}。延长后仍受空闲超时约束。`}
      />
      <div className="mb-2 text-app-text-secondary">延长时长</div>
      <Select
        className="w-full"
        value={extendDuration}
        onChange={setExtendDuration}
        options={[
          { label: "+30 分钟", value: "30m" },
          { label: "+1 小时", value: "1h" },
          { label: "+2 小时", value: "2h" },
        ]}
      />
    </Modal>
  ) : null;

  return { dialogNode, rowActions };
}
